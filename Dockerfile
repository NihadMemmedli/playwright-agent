# Use official Playwright Python image (includes Browsers)
FROM mcr.microsoft.com/playwright/python:v1.49.0-jammy

# Set working directory
WORKDIR /app

# Install Node.js and NPM (Required for 'npx playwright test' in validation stage)
RUN apt-get update && apt-get install -y nodejs npm && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage caching
COPY orchestrator/requirements.txt /app/orchestrator/requirements.txt

# Install Python dependencies
# Upgrade pip first
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /app/orchestrator/requirements.txt

# Install Playwright Python package explicitly (to match requirements)
RUN pip install --no-cache-dir playwright

# Copy the entire project
COPY . /app

# Create a non-root user to satisfy Claude Agent SDK security requirements
RUN useradd -m agent && \
    chown -R agent:agent /app

# Switch to non-root user
USER agent

# Set python path
ENV PYTHONPATH=/app

# Default entrypoint
ENTRYPOINT ["python", "-m", "orchestrator.cli"]
CMD ["--help"]
