# Accessing gateway UI

By default the gateway is not public Interface facing, however, you can access it in two ways (for most gateways):

## SSH

First SSH into the pod.

```
ssh pod@10.60.0.1`
```
Note: You could also use the Cloudflare tunnel if not connected to the local Wi-Fi.

Then, SSH into the gateway from the POD's console

```
ssh root@10.100.0.2
```
Note: Replace `root` if your username on the gateway.

## Web UI

If you gateway has a Web UI, you can access it directly through an SSH port forward.
While connected to the POD's local Wi-Fi, issue the following in a console on your local computer:

```
ssh -L 8080:10.100.0.2:80 pod@10.60.0.1
```
Note: You can replace `10.60.0.1` with the POD's Cloudflare tunnel if avaiable.
Note: This assume your gateway's UI is running on port 80.
