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
3. Build ipfs-daemon and debridge-node images. **Do not forget refact `debridge_node/src/config/chains_config.json` before building**.
4. Gen secrets with base64 like 'echo -e `8a4b8a1b-82e9-4497-b2d2-68b447aa9c14` | base64' for 01-secrets.yaml
5. Check and fix configs in 00-configs.yaml
6. Deploy configs ands secrets:
`kubectl apply -f 00-configs.yaml`
`kubectl apply -f 01-secrets.yaml`
`kubectl apply -f 02-postgres-configs.yaml`
7. Deploy postgres:
`kubectl apply -f 10-postgres.yaml`
8. Deploy ipfs-daemon:
`kubectl apply -f 20-ipfs-daemon.yaml`
9. Deploy debridge-node:
`kubectl apply -f 30-debridge-node.yaml`
