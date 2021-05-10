0. Configure .env:

```
PGUSER=...- postgres user name
PGHOST=...- postgres host
PGPASSWORD=...- postgres password
PGDATABASE=...- postgres database
PGPORT=...- postgres port
CHAINLINK_CONFIG_DATABASE=...- postgres database with chainlink related configurations
SUPPORTED_CHAINS_DATABASE...- postgres database with listened networks confirgurations
SUBMISSIONS_DATABASE...- postgres database with submissions the oracle reacted on
MIN_CONFIRMATIONS...- minimal transaction confirmations required to react on the submission event
EMAIL_ADDRESS...- api credential to access the chainlink node
PASSWORD...- api credential to access the chainlink node
```
1. Build images(see main readme).

# How it works

The initiator uses the database to store:

- the chainink credentials
- the job related configurations
- the contracts- and networks- related information to subscribe events.

The initiator initiates the session with each of the connected chainlink node. It restarts the session every 24 hours as the permission expires.  
The initiator request all the new event up to the last block - $MIN_CONFIRAMTIONS on Debridge contracts each $INTERVAL seconds.
If the new event is noticed it queryies the database to ensure that the oracle didn't react on the event before.
If the oracle haven't submitted the transfer id yet it call's the CL node to execute the job that will send the transaction to the target chain.
The oracle writes the run id to the database along with submission info with $CREATED status.
Every minute the initiator checks query all $CREATED runs. If the run is finished it updates it status in the database.
