pipeline {
    agent any

    environment {
        DOCKER_USER = 'vjettejv'
        IMAGE_NAME = "${DOCKER_USER}/cnpm-backend"
        REGISTRY_CREDENTIALS = 'dockerhub-credentials'
    }

    stages {
        stage('Checkout Code') {
            steps {
                echo "--> Bắt đầu Checkout code từ Git..."
                checkout scm
                script {
                    // Lấy mã Commit SHA ngắn (7 ký tự) làm tag
                    env.GIT_COMMIT_SHORT = sh(script: "git rev-parse --short HEAD", returnStdout: true).trim()
                    echo "Deploying Git Commit: ${env.GIT_COMMIT_SHORT}"
                }
            }
        }

        stage('Automated Tests') {
            steps {
                echo "--> Chạy bộ Automated Tests của Backend..."
                dir('backend') {
                    // Chạy test thông qua Docker container node tạm thời để không phụ thuộc host
                    sh "docker run --rm -v \$(pwd):/app -w /app node:20-alpine npm test"
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                echo "--> Build Docker Image cho Backend với Tag: ${env.GIT_COMMIT_SHORT}..."
                dir('backend') {
                    sh """
                        docker build \
                            -t ${IMAGE_NAME}:${env.GIT_COMMIT_SHORT} \
                            -t ${IMAGE_NAME}:latest \
                            .
                    """
                }
            }
        }

        stage('Push to Registry') {
            steps {
                echo "--> Đăng nhập và Push Image lên Docker Hub..."
                withCredentials([usernamePassword(credentialsId: env.REGISTRY_CREDENTIALS, usernameVariable: 'DOCKER_ID', passwordVariable: 'DOCKER_PWD')]) {
                    sh """
                        echo "\$DOCKER_PWD" | docker login -u "\$DOCKER_ID" --password-stdin
                        docker push ${IMAGE_NAME}:${env.GIT_COMMIT_SHORT}
                        docker push ${IMAGE_NAME}:latest
                    """
                }
            }
        }
    }

    post {
        always {
            echo "--> [Disk Hygiene] Dọn dẹp images tạm để tiết kiệm ổ cứng..."
            sh """
                docker rmi ${IMAGE_NAME}:${env.GIT_COMMIT_SHORT} || true
                docker logout || true
            """
        }
        success {
            echo "Pipeline hoàn thành xuất sắc! Image đã sẵn sàng trên Docker Hub."
        }
        failure {
            echo "Pipeline thất bại! Vui lòng kiểm tra Console Output."
        }
    }
}