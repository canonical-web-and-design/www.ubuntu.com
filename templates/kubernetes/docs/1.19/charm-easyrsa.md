---
wrapper_template: "templates/docs/markdown.html"
markdown_includes:
  nav: kubernetes/docs/shared/_side-navigation.md
context:
  title: 'Easyrsa charm '
  description: Delivers EasyRSA to create a Certificate Authority (CA).
keywords: component, charms, versions, release
tags:
    - reference
sidebar: k8smain-sidebar
permalink: 1.19/charm-easyrsa.html
layout:
    - base
    - ubuntu-com
toc: false
charm_revision: '339'
charm_name: easyrsa
bundle_release: '1.19'
---

This charm delivers the EasyRSA application to act as a Certificate Authority
(CA) and create certificates for related charms.

## Deployment

To deploy EasyRSA:

```
juju deploy cs:~containers/easyrsa
```

## Using the EasyRSA charm

The EasyRSA charm will become a Certificate Authority (CA) and generate a CA
certificate. Other charms need only to relate to EasyRSA with a requires
using the `tls-certificates` interface.

To get a server certificate from EasyRSA, a charm must include the
`interface:tls-certificates` interface in its `layer.yaml` file. The charm must
also require the `tls` interface, in its `metadata.yaml`. The relation name may
be named what ever you wish. Assume the relation is named "certificates" for
these examples.

### CA

The interface will generate a CA certificate immediately. If another charm
requires a CA certificate the code must react to the flag
`certificates.ca.available`. The relationship object has a method named
`get_ca` which returns the CA certificate.

```python
@when('certificates.ca.available')
def store_ca(tls):
    '''Read the certificate authority from the relation object and install it
    on this system.'''
    # Get the CA from the relationship object.
    ca_cert = tls.get_ca()
    write_file('/usr/local/share/ca-certificates/easyrsa.crt', ca_cert)
```

### Client certificate and key

The EasyRSA charm generates a client certificate after the CA certificate is
created. If another charm needs the CA the code must react to the flag
`certificates.client.cert.available`.  The relationship object has a method
that returns the client cert and client key called `get_client_cert`.

```python
@when('certificates.client.cert.available')
def store_client(tls):
    '''Read the client certificate from the relation object and install it on
    this system.'''
    client_cert, client_key = tls.get_client_cert()
    write_file('/home/ubuntu/client.crt', client_cert)
    write_file('/home/ubuntu/client.key', client_key)
```

### Request a server certificate

The interface will set `certificates.available` flag on a relation. The
reactive code should send three values on the relation to request a
certificate. Call the `request_server_cert` method on the relationship object.
The three values are: Common Name (CN), a list of Subject Alt Names (SANs), and
the file name of the certificate (the unit name with the  '/' replaced with an
underscore). For example a client charm would send:

```python
@when('certificates.available')
def send_data(tls):
    # Use the public ip of this unit as the Common Name for the certificate.
    common_name = hookenv.unit_public_ip()
    # Get a list of Subject Alt Names for the certificate.
    sans = []
    sans.append(hookenv.unit_public_ip())
    sans.append(hookenv.unit_private_ip())
    sans.append(socket.gethostname())
    # Create a path safe name by removing path characters from the unit name.
    certificate_name = hookenv.local_unit().replace('/', '_')
    # Send the information on the relation object.
    tls.request_server_cert(common_name, sans, certificate_name)
```

### Server certificate and key

The Easy-RSA charm generates the server certificate and key after the request
have been made. If another charm needs the server certificate the code must
react to the flag `{relation_name}.server.cert.available`.  The relationship
object has a method that returns the server cert and server key called
`get_server_cert`.

```python
@when('certificates.server.cert.available')
def store_server(tls):
    '''Read the server certificate from the relation object and install it on
    this system.'''
    server_cert, server_key = tls.get_server_cert()
    write_file('/home/ubuntu/server.cert', server_cert)
    write_file('/home/ubuntu/server.key', server_key)
```

### Backup/Restore the PKI

This charm includes actions which support creating and managing snapshots 
of the Easy-RSA PKI. Their usage is explained in the following sections:

#### Create backups

Use the charm's `backup` action to capture current snapshot of the Easy-RSA PKI.
This will generate a file in the directory `/home/ubuntu/easyrsa_backup` on the
relevant unit. The backup file follows the naming convention: 
`easyrsa-YYYY-MM-DD_HH-MM-SS.tar.gz`. 

For example:

```bash
juju run-action --wait easyrsa/0 backup
```

For convenience, the output of the `backup` action will output the exact 
`juju scp` command to download the created file to your local machine.

#### List backups

To list all the available backup files stored on the unit, run the following:

```bash
juju run-action --wait easyrsa/0 list-backups
```

This will output a list of filenames. These filenames are relative to the
unit's `/home/ubuntu/easyrsa_backup/` directory.

The names can be used either directly as a parameters for the
`restore` and `delete-backup` actions or as part of a `juju scp` command to
download the backup files. For example, to download a backup named 
`easyrsa-2020-12-10_16-37-54.tar.gz`, the corresponding `juju scp` command
would be:

```bash
juju scp easyrsa/0:/home/ubuntu/easyrsa_backup/easyrsa-2020-12-10_16-37-54.tar.gz .
```

#### Delete backups

To delete a backup file stored on the unit, simply run action `delete-backup`
with parameter `name=<backup_name>`. List of all available backups can be
obtained by running action `list-backups`. To remove all the backups from the
unit, you can specify parameter `all=true`.

Removing a single backup:

```bash
juju run-action --wait easyrsa/0 delete-backup name=easyrsa-2020-12-10_16-37-54.tar.gz
```

Removing all backups:

```
juju run-action --wait easyrsa/0 delete-backup all=true
```

#### Restore backups

To restore a backup, run the `restore` action. This action takes one
parameter, `name`, which specifies the backup file to be restored. This file
must exist on the easyrsa unit for the action to succeed. A list of the
available backups can be obtained by running the `list-backups` action.

For example:

```bash
juju run-action --wait easyrsa/0 restore name=easyrsa-2020-06-10_16-37-54.tar.gz
```

In the case where the backup file is available locally, it can be copied to
the relevant unit before running the restore action by using the `juju scp`
command. For example:

```bash
juju scp easyrsa-2020-12-10_16-37-54.tar.gz easyrsa/0:/home/ubuntu/easyrsa_backup/
```

In the case where units have been added to the Juju model since the 
backup was created, Easy-RSA will issue new certificates to these
units.

<div class="p-notification--warning">
  <p markdown="1" class="p-notification__response">
    <span class="p-notification__status">Warning:</span>
There is a known issue thatthe `kubernetes-master` units
need to be restarted after the certificate change. These units may settle in
the <code>active/idle</code> state but all new pods will hang in the 
<code>pending</code> state. . <br><br>
  </p>
</div>

<div class="p-notification--information">
  <p class="p-notification__response">
  <span class="p-notification__status">Note:</span>
  The Easy-RSA charm notifies all the related units that the CA
  and issued certificates have changed. It's up to the implementation of each
  related charm to react to this change properly. It may take up to several
  minutes for model to settle back into the <code>active/idle</code> state.
  </p>
</div>

## Actions

This section covers Juju actions supported by the charm.
Actions allow specific operations to be performed on a per-unit basis. To
display action descriptions you can run `juju actions easyrsa`, inspect
the charm's `actions.yaml` file or consult the table below:

<!-- NOTE: The actions table is autogenerated from the actions.yaml -->
<!--       file. Edits to the section below will be lost!           -->
<!-- ACTIONS STARTS -->


<!-- ACTIONS ENDS -->
