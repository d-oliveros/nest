#!/bin/bash
SOURCE=$(sed -r 's:\.?/symlink-setup.sh:/bin/nest:' <<< "$PWD""$0")
TARGET=/usr/local/bin/nest

# Modify nest's permissions to be executed
chmod 755 "$SOURCE"

# Create symbolic link
sudo ln -s "$SOURCE" $TARGET

echo "Done. Now you can use nest from your terminal."
nest
