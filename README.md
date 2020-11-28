# AWS Copilot auto deployment

## Requirements

- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) should be configured
- [Docker](https://docs.docker.com/engine/install/)
- [Copilot](https://aws.amazon.com/blogs/containers/introducing-aws-copilot/): Linux installation is explained below.

# A Simple node.js application

This is a simple node.js application which listens to port 3000 and responds with the reversed incoming body. In order to be able to handle Unicode strings as well, rune library is used.

```js
var server = http.createServer(function (req, res) {
    logger(req, res)
    getRawBody(req)
        .then(function (buf) {
            res.statusCode = 200;
            let stringRunes = runes(buf.toString());
            res.end(stringRunes.reverse().join(""));
        })
        .catch(function (err) {
            res.statusCode = 500;
            res.end(err.message);
        })
});
```

So the application should be easy to start by first running the `npm install` inside the app folder with the required packages. Then run the node application using `node index.js` command and the service should listen to port 3000.

# Adding Tests

We should add some tests to this app in order to ensure the proper functionality ;-) So we create first the tests folder and then create `reverse-string.test.js` file. We are going to use `jest` as the test framework, `superagent` as HTTP package, and `expect` for test assertions. 

The service API URL is defined as an environment variable and we set the default value for local testing. Tests could be started using the first npm install to download the dependent packages and then npm test inside the tests folder in order to run all tests.

```js
var superagent = require("superagent")
var expect = require("expect")

// set default value if env var API_URL is missing
const api_url = process.env.API_URL || 'http://localhost:3000'

console.log('api_url is: ', api_url)

test('Should respond at specified api url', async () => {
    const status = await (await superagent(api_url)).status
    expect(status).toEqual(200);
});
```

So at this stage, we have a small service for reversing the incoming strings (what about the name reverser ;-)) and some tests that we are going to enhance during the application development. 

For bug fixing, we follow the TDD approach. First, we add a test in order to check the reported bug and then fix the code.

If tests passed, please push your changes to your GitHub repository, this step is required for the next step when we want to automate the deployment using `AWS CodePipeline`.

# Installing Copilot

Run the following commands with sudo since it will copy Copilot into the *user/local/bin* folder which is a protected system folder.

```bash
$ sudo curl -Lo /usr/local/bin/copilot https://github.com/aws/copilot-cli/releases/latest/download/copilot-linux
$ sudo chmod +x /usr/local/bin/copilot
$ copilot --help
```

# Initializing the application

The first step is to initialize the application which will then create a service named `reverser`) after creating the app which we named `std` and is stored in the Copilot's workspace. The Service type is Load Balanced Web Service, it shoud use the Dockerfile inside the app folder and deploy it to the test environment.

```bash
$ copilot init -a std -n reverser -t "Load Balanced Web Service" -d app/Dockerfile --deploy
```

Print the ECS Cluster in test environment:

```bash
$ copilot svc show -n reverser
```

And the current deployment status:

```bash
$ copilot svc show -n reverser
```

# CloudFormation Stacks

After Copilot initialization or deploy commands, I recommend you to visit your CloudFormation page in the AWS console. Copilot creates/uses for each action a dedicated stack using a built-in CloudFormation template which shows the resource creation/update required by that command.

- `copilot app init`: Creates a stack that includes the administration and execution roles provisioning. [stack:str-infrastructure-roles] [stack:StackSet-std-infrastructure-XYZXYZ]
- `copilot env init`: Creates all required resources for a given environment. For example VPC and subnets on 2 availability zones. [stack:std-test], [stack:std-prod]
- `copilot svc init`: Creates related resources depending on the type of service. For example *Backend Service* or *Load Balanced Web Serivce* or *Scheduled Job*. [stack:std-test-reserver], [stack:std-prod-reserver]
- `copilot pipeline init`: Creates a CI/CD pipeline. This pipeline asks for including environments in the pipeline, you should add both test and prod environments. A release to production will follow only a successful test deployment.

We selected the service type Load Balanced Web Service and Copilot creates the required ECS cluster with all related Task, Service and Task Definition, and a Load balancer. 
In the CloudFormation stacks, you could inspect the created/updated resources or inspect resource creation errors. 

Stacks used for creating the environments have [app]-[env] naming and for a service deployment [app]-[env]-[service] naming format.

After creating the test environment, Copilot starts a deployment to the newly created environment by starting to build your Dockerfile and push it to ECR for the deployment in the ECS.

After deployment is finished, Copilot prints the URL for the test environment. You could now test it by sending the following command to it:

```bash
$ curl -d "Hello" http://[TestLoadbalancerDns]
```

Now we add the prod environment

```bash
$ copilot env init --prod --name prod --profile default
```

And start the deployment to the prod

```bash
$ copilot svc deploy --name reverser --env prod
```

Again we check the current service details and status:

```bash
$ copilot svc show -n reverser -e prod
$ copilot svc status -n reverser -e prod
```

Or check its logs

```bash
$ copilot svc logs -name reverser -env prod --follow
```

This was pretty cool, provisioning 2 environments and all required infrastructure for ECS cluster and at the end deployments to both environments, finished under 5 min!

# Application release automation

In order to have an automatic release deployment, we should use `AWS CodePipeline` which will listen to our GitHub repository where reverser is stored and the deployment could be triggered after a code change push to GitHub (`git push`). Since we have test and prod environments, code will only be released to prod, if the test stage passed successfully otherwise it will be stopped.

Create the pipeline using this command:

```bash
$ copilot pipeline init
```

Add both environments to the pipeline, then it should detect your GitHub repository URL and current branch. The pipeline will ask for your GitHub personal access token, please generate one in GitHub in the Settings menu, Developer Settings.

After pushing your changes to GitHub, start the pipeline by the following command:

## Fixing docker pull limit issue

[Docker](https://docs.docker.com/docker-hub/download-rate-limit/) has enabled download pull limit since november, it means during the docker build process, it will try to pull the required image defined in the Dockerfile and it will be blocked by docker hub, so your CodePipline build will fail. In order to fix this, docker should be logged in with your credentials. Please follow the instructions in the [AWS doc](https://aws.amazon.com/premiumsupport/knowledge-center/codebuild-docker-pull-image-error/). I've added the docker login command in the buildspec line 45. You should store your credentials in the Secret Manager and define them in the Build Project as Environment variables. 

```bash
$ copilot pipeline update
```

Copilot will prepare the pipeline for both stages, the first test will run the provided test and if they passed, the deployment will be released to the prod stage.

# CleanUp

All previously mentioned CloudFormation stacks could be deleted using Copilot commands in the following order:

```bash
$ copilot pipeline delete
$ copilot svc delete
$ copilot env delete --name test
$ copilot env delete --name prod
$ copilot app delete
```
