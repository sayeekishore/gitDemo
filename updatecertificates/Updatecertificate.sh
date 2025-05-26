# This script is used to remotely connect to a device via SSH, list certificates in the device’s database, and then reboot the device.
#!/bin/bash
SSH_KEY="./id_ecdsa"
DEVICE_IP=$1

if [ -z "$DEVICE_IP" ]; then
  echo "No device IP provided."
  exit 1
fi
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no root@"$DEVICE_IP" "certutil -d /home/default/.pki/nssdb -L; reboot"
echo "Certificate is uploaded to the following Devcie: $DEVICE_IP"
