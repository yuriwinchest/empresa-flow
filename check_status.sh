#!/bin/bash
# Final check script
podman ps
curl -I localhost:8000/rest/v1/
