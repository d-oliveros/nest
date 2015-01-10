#!/bin/bash
SOURCE=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/bin/nest
TARGET=/usr/local/bin/nest

chmod +x ${SOURCE}
sudo ln -s ${SOURCE} ${TARGET}

echo "Done. Now you can use nest from your terminal."
nest
