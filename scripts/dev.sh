#!/bin/bash

# This script copies the source code of the packages in the packages/ directory
# to the node_modules/@statelyai/ directory of each destination project.

# Load environment variables from .env file
if [ -f .env ]; then
  export $(cat .env | xargs)
fi

# Split the DEV_DESTINATIONS variable into an array
IFS=',' read -r -a destinations <<<"$DEV_DESTINATIONS"

# Package name
package="inspect"

for destination in "${destinations[@]}"; do
  echo "Copying ${package} to ${destination}"
  rm -rf "${destination}/node_modules/@statelyai/${package}"
  cp -r "./" "${destination}/node_modules/@statelyai/${package}"
done
