@Library('mdblp-library') _
pipeline {
    agent any
    stages {
        stage('Initialization') {
            steps {
                script {
                    utils.initPipeline()
                    if (env.GIT_COMMIT == null) {
                        // git commit id must be a 40 characters length string (lower case or digits)
                        env.GIT_COMMIT = "f".multiply(40)
                    }
                    env.RUN_ID = UUID.randomUUID().toString()
                    env.imageBuild = "docker.ci.diabeloop.eu/node-build:16"
                }
            }
        }
        stage('Build') {
            agent {
                docker {
                    image env.imageBuild
                }
            }
            steps {
                withCredentials([string(credentialsId: 'nexus-token', variable: 'NEXUS_TOKEN')]) {
                    sh "npm version"
                    sh "npm install"
                    sh "npm run build-ci"
                    stash name: "node_modules", includes: "node_modules/**"
                }
            }
        }
        stage('Test') {
            steps {
                unstash "node_modules"
                echo 'start mongo to serve as a testing db'
                sh 'docker network create messageapitest${RUN_ID} && docker run --rm -d --net=messageapitest${RUN_ID} --name=mongo4messageapitest${RUN_ID} mongo:4.2'
                script {
                    docker.image(env.imageBuild).inside("--net=messageapitest${RUN_ID}") {
                        withCredentials([string(credentialsId: 'nexus-token', variable: 'NEXUS_TOKEN')]) {
                            sleep 5
                            sh "MONGO_CONN_STRING='mongodb://mongo4messageapitest${RUN_ID}:27017/messageapi_test' npm run test-ci"
                        }
                    }
                }
            }
            post {
                always {
                    sh 'docker stop mongo4messageapitest${RUN_ID} && docker network rm messageapitest${RUN_ID}'
                    junit 'test-report.xml'
                }
            }
        }
        stage('Package') {
            steps {
                withCredentials([string(credentialsId: 'nexus-token', variable: 'NEXUS_TOKEN')]) {
                    pack()
                }
            }
        }
        stage('Documentation') {
            steps {
                unstash "node_modules"
                genDocumentation()
                dir("output") {
                    archiveArtifacts artifacts: '*-soup.md', allowEmptyArchive: true
                }
            }
        }
        stage('Publish') {
            when { branch "dblp" }
            steps {
                publish()
            }
        }
    }
}
