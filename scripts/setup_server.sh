#!/bin/bash
# Server setup script for Corporate Research System

set -e

echo "=== Corporate Research Server Setup ==="
echo

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root (use sudo)" 
   exit 1
fi

# Get deployment type
echo "Select deployment type:"
echo "1) Docker"
echo "2) systemd (Linux service)"
echo "3) Google Cloud Functions"
read -p "Enter choice [1-3]: " choice

case $choice in
    1)
        echo "Setting up Docker deployment..."
        
        # Check if Docker is installed
        if ! command -v docker &> /dev/null; then
            echo "Docker not found. Installing Docker..."
            curl -fsSL https://get.docker.com -o get-docker.sh
            sh get-docker.sh
            rm get-docker.sh
        fi
        
        # Check if docker-compose is installed
        if ! command -v docker-compose &> /dev/null; then
            echo "Installing docker-compose..."
            curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
            chmod +x /usr/local/bin/docker-compose
        fi
        
        # Copy environment file
        if [ ! -f .env ]; then
            cp .env.example .env
            echo "Please edit .env file with your API keys and settings"
            echo "Then run: docker-compose up -d"
        fi
        
        echo "Docker setup complete!"
        ;;
        
    2)
        echo "Setting up systemd service..."
        
        # Create user
        if ! id -u corporate-research > /dev/null 2>&1; then
            useradd -m -s /bin/bash corporate-research
        fi
        
        # Create directories
        mkdir -p /opt/corporate-research
        mkdir -p /opt/corporate-research/logs
        
        # Copy files
        cp -r ./* /opt/corporate-research/
        chown -R corporate-research:corporate-research /opt/corporate-research
        
        # Setup Python environment
        su - corporate-research -c "cd /opt/corporate-research && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
        
        # Copy environment file
        if [ ! -f /opt/corporate-research/.env ]; then
            cp /opt/corporate-research/.env.example /opt/corporate-research/.env
            chown corporate-research:corporate-research /opt/corporate-research/.env
            chmod 600 /opt/corporate-research/.env
            echo "Please edit /opt/corporate-research/.env with your API keys"
        fi
        
        # Install systemd service
        cp systemd/corporate-research.service /etc/systemd/system/
        systemctl daemon-reload
        systemctl enable corporate-research
        
        echo "systemd setup complete!"
        echo "Start the service with: systemctl start corporate-research"
        ;;
        
    3)
        echo "Setting up Google Cloud Functions..."
        
        # Check if gcloud is installed
        if ! command -v gcloud &> /dev/null; then
            echo "gcloud CLI not found. Please install it first:"
            echo "https://cloud.google.com/sdk/docs/install"
            exit 1
        fi
        
        # Check authentication
        if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
            echo "Please authenticate first: gcloud auth login"
            exit 1
        fi
        
        # Get project ID
        read -p "Enter your GCP project ID: " project_id
        gcloud config set project $project_id
        
        echo "Ready to deploy to Google Cloud Functions"
        echo "Run: ./deploy.sh"
        ;;
        
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo
echo "Setup completed! Next steps:"
echo "1. Configure your API keys in the .env file"
echo "2. Set up SSL certificates for HTTPS (recommended)"
echo "3. Configure firewall rules"
echo "4. Set up monitoring and logging"
echo
echo "See SERVER_DEPLOYMENT.md for detailed instructions"