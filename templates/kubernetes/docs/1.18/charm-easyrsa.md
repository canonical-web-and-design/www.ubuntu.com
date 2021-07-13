---
bundle_release: '1.18'
charm_name: easyrsa
charm_revision: '325'
context:
  description: Delivers EasyRSA to create a Certificate Authority (CA).
  title: 'Easyrsa charm '
keywords: component, charms, versions, release
layout:
- base
- ubuntu-com
markdown_includes:
  nav: kubernetes/docs/shared/_side-navigation.md
permalink: 1.18/charm-easyrsa.html
sidebar: k8smain-sidebar
tags:
- reference
toc: false
wrapper_template: "templates/docs/markdown.html"
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

The EasyRSA charm generates the server certificate and key after the request
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