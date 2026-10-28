pipeline {
    agent any

    environment {
        // ĐIỀN ĐÚNG USERNAME DOCKER HUB CỦA BẠN VÀO ĐÂY
        DOCKER_USER = 'vjettejv'
        IMAGE_NAME = "${DOCKER_USER}/cnpm-backend"
        REGISTRY_CREDENTIALS = 'dockerhub-credential'
    }

    stages {
        stage('Checkout Code') {
            steps {
                echo "--> Bắt đầu Checkout code từ Git..."
                checkout scm
                script {
                    env.GIT_COMMIT_SHORT = sh(script: "git rev-parse --short HEAD", returnStdout: true).trim()
                    echo "Deploying Git Commit: ${env.GIT_COMMIT_SHORT}"
                }
            }
        }

        stage('Automated Tests') {
            steps {
                echo "--> Chạy bộ Automated Tests bằng Docker Build Stage..."
                dir('backend') {
                    // Build target tester: Nếu test FAIL, lệnh docker build sẽ exit code 1 và dừng pipeline ngay lập tức!
                    sh "docker build --target tester -t ${IMAGE_NAME}:test ."
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                echo "--> Build Production Image cho Backend với Tag: ${env.GIT_COMMIT_SHORT}..."
                dir('backend') {
                    sh """
                        docker build \
                            --target runner \
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
                docker rmi ${IMAGE_NAME}:test || true
                docker rmi ${IMAGE_NAME}:${env.GIT_COMMIT_SHORT} || true
                docker logout || true
            """
        }
        success {
            echo "🎉 Pipeline hoàn thành xuất sắc! Image đã sẵn sàng trên Docker Hub."
        }
        failure {
            echo "❌ Pipeline thất bại! Vui lòng kiểm tra Console Output."
        }
    }
}