<br/>
<p align="center">
<a href="https://debridge.finance/" target="_blank">
<img src="https://user-images.githubusercontent.com/10200871/137014801-40decb80-0595-4f0f-8ee5-f0f1ab5c0380.png" width="225" alt="logo">
</a>
</p>
<br/>
This is a example config files for k8s.<br/>
Please use your cloud provider postgres(postgres as service) and persistent volumes for ipfs-daemon and debridge-node.

## How to run:
1. Please read main README from this repo.
2. Create a keystore file for the validation node.
3. Gen secrets with base64 like 'echo -e `8a4b8a1b-82e9-4497-b2d2-68b447aa9c14` | base64' for 01-secrets.yaml
4. Check and fix configs in 00-configs.yaml and persistent volumes in 03-persistent-volumes.yaml
5. Deploy configs, secrets and pv:
`kubectl apply -f 00-configs.yaml`
`kubectl apply -f 01-secrets.yaml`
`kubectl apply -f 02-postgres-configs.yaml`
`kubectl apply -f 03-persistent-volumes.yaml`
6. Deploy postgres:
`kubectl apply -f 10-postgres.yaml`
7. Deploy ipfs-daemon:
`kubectl apply -f 20-ipfs-daemon.yaml`
8. Deploy debridge-node:
`kubectl apply -f 30-debridge-node.yaml`

## Clean persistent volume claim:
If you want to clean pgdata or any other persistent data:
`kubectl delete statefulset.apps/postgres`
`kubectl delete pvc/pgdata`
`kubectl delete pv/pgdata`
`kubectl apply -f 03-persistent-volumes.yaml`
`kubectl apply -f 10-postgres.yaml`
