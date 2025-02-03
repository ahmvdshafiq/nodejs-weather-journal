pipeline {
    agent {
        docker {
            image 'docker:19.03.12-dind'
            args '-u root --privileged -v /var/run/docker.sock:/var/run/docker.sock'
        }
    }

    environment {
        DOCKERHUB_CRED_ID = 'dockerhub-token'
    }

    stages {
        stage('Checkout') {
            steps {
                git url: 'https://github.com/ahmvdshafiq/nodejs-weather-journal', branch: 'master'
            }
        }

        stage('Install Node.js') {
            steps {
                script {
                    sh '''
                    apk add --no-cache curl libstdc++ gcc g++
                    curl -fsSL https://unofficial-builds.nodejs.org/download/release/v16.20.2/node-v16.20.2-linux-x64-musl.tar.xz | tar -xJ -C /usr/local --strip-components=1
                    '''
                }
            }
        }

        stage('Install Dependencies') {
            steps {
                script {
                    // Install project dependencies including Mocha and mocha-junit-reporter
                    sh 'npm install'
                }
            }
        }

        stage('Run Mocha Tests') {
            steps {
                script {
                    // Ensure the test-results directory exists, and run the tests
                    sh '''
                    mkdir -p test-results
                    npx mocha --reporter mocha-junit-reporter --reporter-options mochaFile=./test-results/results.xml || echo "Tests failed, continuing for debugging"
                    '''
                }
            }
        }

        stage('Publish Test Results') {
            steps {
                script {
                    // Check if the test results file exists, and publish it
                    if (fileExists('test-results/results.xml')) {
                        junit testResults: 'test-results/results.xml', allowEmptyResults: true, healthScaleFactor: 1.0, 
                            testDataPublishers: [
                                [$class: 'FailedTestPublisher']
                            ],
                            thresholds: [
                                [$class: 'FailedThreshold', failureThreshold: '0', unstableThreshold: '0'],
                                [$class: 'SkippedThreshold', failureThreshold: '0', unstableThreshold: '0']
                            ]
                    } else {
                        echo 'No test results found. Mocha tests may have failed to run.'
                    }
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    docker.build("madbakoyoyo/node-weather-app:${env.BUILD_NUMBER}")
                }
            }
        }

        stage('Push Docker Image') {
            steps {
                script {
                    withCredentials([string(credentialsId: 'dh_pass', variable: 'dockethub_pass')]) {
                        docker.withRegistry('https://index.docker.io/v1/', DOCKERHUB_CRED_ID) {
                            sh 'echo $dockethub_pass | docker login -u madbakoyoyo --password-stdin'
                            docker.image("madbakoyoyo/node-chat-app:${env.BUILD_NUMBER}").push()
                        }
                    }
                }
            }
        }

        stage('Deploy to EC2') {
            steps {
                script {
                    withCredentials([sshUserPrivateKey(credentialsId: '77fc5aed-0859-4073-9928-cb379b73c0ae', keyFileVariable: 'keyfile')]) {
                        sh """
                        ssh -o StrictHostKeyChecking=no -i ${keyfile} ubuntu@13.215.51.100 <<EOF
                            docker stop node-weather-app || true
                            docker rm node-weather-app || true
                            docker pull madbakoyoyo/node-weather-app:${env.BUILD_NUMBER}
                            docker run -d -p 3000:3000 --name node-chat-app madbakoyoyo/nodejs-weather-journal:${env.BUILD_NUMBER}
EOF
                        """
                    }
                }
            }
        }
    }

    post {
        always {
            script {
                echo "Cleaning up temporary files."
                sh 'rm -rf test-results'
            }
        }

        unstable {
            echo "Pipeline completed with UNSTABLE status. Check test logs and thresholds."
        }

        failure {
            echo "Pipeline failed. Investigate issues in earlier stages."
        }
    }
}
