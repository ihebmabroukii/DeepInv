
import os
import datetime
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
from config import Config

class PKIManager:
    def __init__(self, cert_dir='certs'):
        self.cert_dir = cert_dir
        if not os.path.exists(self.cert_dir):
            os.makedirs(self.cert_dir)
            
        self.ca_key_path = os.path.join(self.cert_dir, 'root_ca.key')
        self.ca_cert_path = os.path.join(self.cert_dir, 'root_ca.crt')
        
    def _generate_key(self):
        return rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
        )

    def _save_key(self, key, path):
        with open(path, "wb") as f:
            f.write(key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.TraditionalOpenSSL,
                encryption_algorithm=serialization.NoEncryption(),
            ))

    def _save_cert(self, cert, path):
        with open(path, "wb") as f:
            f.write(cert.public_bytes(serialization.Encoding.PEM))

    def ensure_root_ca(self):
        """Generates Root CA if not exists"""
        if os.path.exists(self.ca_key_path) and os.path.exists(self.ca_cert_path):
            return

        print("🔐 Generating Root CA...")
        key = self._generate_key()
        self._save_key(key, self.ca_key_path)

        subject = issuer = x509.Name([
            x509.NameAttribute(NameOID.COUNTRY_NAME, u"TN"),
            x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, u"Tunis"),
            x509.NameAttribute(NameOID.ORGANIZATION_NAME, u"Security Platform"),
            x509.NameAttribute(NameOID.COMMON_NAME, u"Security Platform Root CA"),
        ])

        cert = x509.CertificateBuilder().subject_name(
            subject
        ).issuer_name(
            issuer
        ).public_key(
            key.public_key()
        ).serial_number(
            x509.random_serial_number()
        ).not_valid_before(
            datetime.datetime.utcnow()
        ).not_valid_after(
            datetime.datetime.utcnow() + datetime.timedelta(days=3650)
        ).add_extension(
            x509.BasicConstraints(ca=True, path_length=None), critical=True,
        ).sign(key, hashes.SHA256())

        self._save_cert(cert, self.ca_cert_path)
        print(f"✅ Root CA created at {self.cert_dir}")

    def issue_client_cert(self, client_id):
        """Issues a cert for an agent signed by the CA"""
        # Load CA
        with open(self.ca_key_path, "rb") as f:
            ca_key = serialization.load_pem_private_key(f.read(), password=None)
        with open(self.ca_cert_path, "rb") as f:
            ca_cert = x509.load_pem_x509_certificate(f.read())

        # Generate Client Key
        client_key = self._generate_key()
        
        # Generate Client CSR (Client Signing Request) - internal step usually
        # But we can just build the cert directly if we are the CA
        subject = x509.Name([
            x509.NameAttribute(NameOID.COUNTRY_NAME, u"TN"),
            x509.NameAttribute(NameOID.ORGANIZATION_NAME, u"Security Platform Agents"),
            x509.NameAttribute(NameOID.COMMON_NAME, f"agent-{client_id}"),
            x509.NameAttribute(NameOID.USER_ID, client_id), # Custom field potentially
        ])

        cert = x509.CertificateBuilder().subject_name(
            subject
        ).issuer_name(
            ca_cert.subject
        ).public_key(
            client_key.public_key()
        ).serial_number(
            x509.random_serial_number()
        ).not_valid_before(
            datetime.datetime.utcnow()
        ).not_valid_after(
            datetime.datetime.utcnow() + datetime.timedelta(days=365)
        ).add_extension(
            x509.BasicConstraints(ca=False, path_length=None), critical=True,
        ).sign(ca_key, hashes.SHA256())

        # Return PEMs
        key_pem = client_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.TraditionalOpenSSL,
            encryption_algorithm=serialization.NoEncryption(),
        ).decode('utf-8')
        
        cert_pem = cert.public_bytes(serialization.Encoding.PEM).decode('utf-8')
        ca_pem = ca_cert.public_bytes(serialization.Encoding.PEM).decode('utf-8')
        
        return key_pem, cert_pem, ca_pem

    def generate_server_cert(self, hostname="localhost"):
        """Generates server cert signed by CA for Nginx"""
        server_key_path = os.path.join(self.cert_dir, 'server.key')
        server_cert_path = os.path.join(self.cert_dir, 'server.crt')

        if os.path.exists(server_key_path) and os.path.exists(server_cert_path):
             return

        print(f"🔐 Generating Server Cert for {hostname}...")
        
        with open(self.ca_key_path, "rb") as f:
            ca_key = serialization.load_pem_private_key(f.read(), password=None)
        with open(self.ca_cert_path, "rb") as f:
            ca_cert = x509.load_pem_x509_certificate(f.read())

        server_key = self._generate_key()
        
        subject = x509.Name([
            x509.NameAttribute(NameOID.COMMON_NAME, hostname),
        ])
        
        cert = x509.CertificateBuilder().subject_name(
            subject
        ).issuer_name(
            ca_cert.subject
        ).public_key(
            server_key.public_key()
        ).serial_number(
            x509.random_serial_number()
        ).not_valid_before(
            datetime.datetime.utcnow()
        ).not_valid_after(
            datetime.datetime.utcnow() + datetime.timedelta(days=825)
        ).add_extension(
             x509.SubjectAlternativeName([x509.DNSName(hostname), x509.DNSName("backend"), x509.DNSName("platform.bank.tn")]),
             critical=False,
        ).sign(ca_key, hashes.SHA256())

        self._save_key(server_key, server_key_path)
        self._save_cert(cert, server_cert_path)
        print("✅ Server Cert created.")

# Singleton-ish usage
pki = PKIManager()
