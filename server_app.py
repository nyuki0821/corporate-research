#!/usr/bin/env python3
"""
Flask server for Corporate Research System
Provides REST API and web interface for company information collection
"""

import os
import json
import logging
from datetime import datetime
from flask import Flask, request, jsonify, render_template, send_file
from flask_cors import CORS
import tempfile
from typing import Dict, Any

# Import existing modules
from modules.workflow import ResearchWorkflow
from modules.sheets_client import GoogleSheetsClient
from config import Config

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for API access

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize configuration
config = Config()

# Store active jobs (in production, use Redis or database)
active_jobs = {}


@app.route('/')
def index():
    """Serve the web interface"""
    return render_template('index.html')


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'service': 'corporate-research-api',
        'version': '1.0.0'
    })


@app.route('/api/process', methods=['POST'])
def process_companies():
    """Process company information collection"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['spreadsheet_id', 'input_range', 'output_range']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'error': f'Missing required field: {field}'
                }), 400
        
        # Create job ID
        job_id = f"job_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        
        # Store job info
        active_jobs[job_id] = {
            'status': 'processing',
            'started_at': datetime.utcnow().isoformat(),
            'spreadsheet_id': data['spreadsheet_id'],
            'progress': 0,
            'total': 0
        }
        
        # Process in background (in production, use Celery or similar)
        try:
            workflow = ResearchWorkflow(config)
            result = workflow.process_spreadsheet(
                spreadsheet_id=data['spreadsheet_id'],
                input_range=data['input_range'],
                output_range=data['output_range']
            )
            
            # Update job status
            active_jobs[job_id].update({
                'status': 'completed',
                'completed_at': datetime.utcnow().isoformat(),
                'result': result
            })
            
            return jsonify({
                'job_id': job_id,
                'status': 'completed',
                'result': result
            })
            
        except Exception as e:
            active_jobs[job_id].update({
                'status': 'failed',
                'error': str(e),
                'completed_at': datetime.utcnow().isoformat()
            })
            raise
            
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return jsonify({
            'error': f'Processing failed: {str(e)}'
        }), 500


@app.route('/api/jobs/<job_id>', methods=['GET'])
def get_job_status(job_id):
    """Get job status"""
    if job_id not in active_jobs:
        return jsonify({'error': 'Job not found'}), 404
    
    return jsonify(active_jobs[job_id])


@app.route('/api/config', methods=['GET'])
def get_config():
    """Get configuration status (hide sensitive data)"""
    return jsonify({
        'tavily_configured': bool(os.getenv('TAVILY_API_KEY')),
        'openai_configured': bool(os.getenv('OPENAI_API_KEY')),
        'sheets_configured': bool(os.getenv('GOOGLE_SHEETS_CREDENTIALS')),
        'batch_size': config.batch_size,
        'processing_timeout': config.processing_timeout,
        'max_retries': config.max_retries
    })


@app.route('/api/export/<job_id>', methods=['GET'])
def export_results(job_id):
    """Export job results as CSV"""
    if job_id not in active_jobs:
        return jsonify({'error': 'Job not found'}), 404
    
    job = active_jobs[job_id]
    if job['status'] != 'completed':
        return jsonify({'error': 'Job not completed'}), 400
    
    # Create CSV file
    with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.csv') as f:
        # Write CSV header
        f.write('Company Name,Business Description,Main Products/Services,Target Market,Competitive Advantage,Recent News\n')
        
        # Write results (simplified - adjust based on actual data structure)
        if 'result' in job and 'processed' in job['result']:
            for company in job['result']['processed']:
                f.write(f'"{company}","Data processed","","","",""\n')
        
        temp_path = f.name
    
    return send_file(
        temp_path,
        as_attachment=True,
        download_name=f'research_results_{job_id}.csv',
        mimetype='text/csv'
    )


if __name__ == '__main__':
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    # Get port from environment or default
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV') == 'development'
    
    # Run server
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug
    )