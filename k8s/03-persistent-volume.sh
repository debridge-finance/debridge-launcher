#!/bin/bash
if [ ! -f ./persistent-result ]
then
    aws ec2 create-volume --availability-zone eu-central-1a --size 10 > persistent-result
fi
cat persistent-result
echo 'you can show volumes with: "aws ec2 describe-volumes"'
echo 'make volumes in valid zone(nodes zone)'
echo 'if you want to destroy volume: "aws ec2 delete-volume --volume-id $id"'
