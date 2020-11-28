# AWS Copilot auto deployment

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

The first step is to initialize the application which will then create a service (we named it `reverser`) after creating the app which we named `std` and is stored in the Copilot's workspace.

```bash
$ copilot init
```

# CloudFormation Stacks

After Copilot initialization or deploy commands, I recommend you to visit your CloudFormation page in the AWS console. Copilot creates/uses for each action a dedicated stack using a built-in CloudFormation template which shows the resource creation/update required by that command.

- `copilot app init`: Creates a stack that includes the administration and execution roles provisioning.
- `copilot env init`: Includes all related resources for a given environment. For example VPC and subnets for 2 availability zones.
- `copilot svc init`: Creates related resources depending on the type of service. For example Backend or Load balanced web.
- `copilot pipeline init`: Creates a CI/CD pipeline. This pipeline asks for including environments in the pipeline, you should add both test and prod environments. A release to production will follow only a successful test deployment.

We selected the service type Load balanced web and Copilot creates the required ECS cluster with all related Task, Service and Task Definition, and a Load balancer. 
In the CloudFormation stacks, you could inspect the created/updated resources or inspect resource creation errors. 

Stacks used for creating the environments have [app]-[env] naming and for a service deployment [app]-[env]-[service] naming format.

After creating the test environment, Copilot starts a deployment to the newly created environment by starting to build your Dockerfile and push it to ECR for the deployment in the ECS.

After deployment is finished, Copilot prints the URL for the test environment. You could now test it by sending the following command to it:

```bash
$ curl -d "Hello" http://[TestLoadbalancerDns]
```

The created service can be inspected by the following command, which will show the environment hardware specification and the configured service properties:

```bash
$ copilot svc show
```

For the current Service status running in the ECS Cluster, use this command:

```bash
$ copilot svc status
```

# Adding the prod environment

```bash
$ copilot env init --prod --name prod --profile default
```

## Deploying to the prod

```bash
$ copilot svc deploy --name reverser --env prod
```

Now you could check the current service details:

```bash
$ copilot svc show
```

Or check its logs

```bash
$ copilot svc logs -name reverser -env prod --follow
```

# Application release automation

In order to have an automatic release deployment, we should use `AWS CodePipeline` which will listen to our GitHub repository where reverser is stored and the deployment could be triggered after a code change push to GitHub (`git push`). Since we have test and prod environments, code will only be released to prod, if the test stage passed successfully otherwise it will be stopped.

Create the pipeline using this command:

```bash
$ copilot pipeline init
```

Add both environments to the pipeline, then it should detect your GitHub repository URL and current branch. The pipeline will ask for your GitHub personal access token, please generate one in GitHub in the Settings menu, Developer Settings.

After pushing your changes to GitHub, start the pipeline by the following command:

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
