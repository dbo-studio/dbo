#!/usr/bin/with-contenv bash

for config in /etc/ssh/sshd_config /config/sshd/sshd_config; do
	if [ -f "$config" ]; then
		sed -i 's/^AllowTcpForwarding .*/AllowTcpForwarding yes/' "$config"
	fi
done
