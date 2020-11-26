# AWS Copilot auto deployment

# Preparing the node application

This is a simple node.js application which listens to port 3000 and responds the reversed incomming body. In order to be able to hande unicode strings as well, rune library is used.

At the end the server is closed after receiving the termination signal.

Pino package is used in order to log the request and response to the standard output.

So the application should be easy to start by first running the npm install inside the app folder with the required packages. Then run the node application using node index.js command and the service should listen to port 3000.

# Tests?

We should add some tests to this mini server in order to ensure the proper functionality ;-) So we create first the tests folder and then create reverse-string.test.js file. We are going to use `jest` as test framework, `superagent` as http package and `expect` for test assertions. The service url is defined as environment variable and we set a default value for local testing. Tests could be started using first npm install to downoad the dependent packages and then npm test inside the tests folder in order to run all tests.

So at this stage we have a small service for reversing the incomming strings (what about the name reverser ;-)) and some tests that we are going to enhance during the application development or if we face any bugs. In that case we first add the additiona test in order check the reported bug and then fix the code. The known TDD approch.

If tests passed, please push your changes to your github repository, this step required for the next step when we want to automate the deployment using CodePipeline.

# Installing Copilot in Linux

Run this with sudo since it will copy copiot into the user/local/bin folder which is protected system folder.

```bash
$ sudo curl -Lo /usr/local/bin/copilot https://github.com/aws/copilot-cli/releases/latest/download/copilot-linux
$ sudo chmod +x /usr/local/bin/copilot
$ copilot --help
```

# Initializing the application

The first step is to initialize the application which will then create a service (we named it reverser) after creating the app which we named std and is stored in the copilots workspace. This will be followed by creating a test environment. 

`copilot init`

After copilot initialization or deploy commands, I recommend you to visit your cloudformation page in aws console. Copilot creates for each action a dedicated stack which shows the reource creation needed by that command. For example app init, creates a cloudformation stack which creates administration and execution roles which will be used in the upcomming operations.

Environment `test` will be created using it's related stack as well, which includes the vpc, 2 availability zones, the ecs cluster and all related resources. The same is valid for our prod environment. In the cloudformation stacks, you could inspect the created resources or for the case that something goes wrong during creation, you could check the error or why a resource could not be created.

Stacks used for creating the environments have [app]-[env] naming and for a deployment [app]-[env]-[service] naming format. 

After creating the test environment, copilots starts a deployment to the newly created test environment by starting to build your Dockerfile and push it to ECR for the deployment in the ECS. The rellated Task definition will pull the provided docker image and start the service as a container.

When the deployment is finished, copilot prints the url for test load balancer. You could now test it by sending the following command to it:

```bash
$ curl -d "Hello" http://[TestLoadbalancerDns]
```

The created service can be inspected by the following command, which will show the environment hardware specification, and the configured service properties:

```bash
$ copilot svc show
```

For the current Service status running in the ECS Cluster, use this command:

```bash
$ copilot svc status
```

# Adding prod environment

`copilot env init --prod --name prod --profile default`

# Deploying to the prod

`copilot svc deploy --name reverser --env prod`

Now you could check the current service details:

`copilot svc show`

Or check its logs

`copilot svc logs -name reverser -env prod --follow`

# Application release automation

In order to have an automatic release deployment we should use aws codepipeline which will listen to our github repository where reverser is stored and the deployment could be triggered after a code change push in github (`git push`). Since we have test and prod environment, code will only relesed to prod, if test stage passed succcessfully otherwise it will be stopped.

`copilot pipeline init`

Add both environments to the pipeline, then it should detect you git url and current branch. The pipeline wil ask for your github personal access token, please generate one in github in the Settings menu, Developer Settings.

Copilot will prepare the pipeline for both stages, first test which will run the provided test and if they passed, the deployment will be released to the prod stage.

# CleanUp

In ordder to clean up all created resources during this demo, we should delete them using copilot. All resources are created sofar using built-it cloudformation templates for the following cases:

- After copilot app install a stack is created for creating administrative roles
- copilot env creates all related resources using a built-in cloudformation template per environment
- copilot pipeline also creates a cloudformation stack for the cd pipeline

All mentioned cloudformation stacks could be deleted using copilot commands in the following order:

- `copilot pipeline delete`
- `copilot svc delete`
- `copilot env delete --name test`
- `copilot env delete --name prod`
- `copilot app delete`
