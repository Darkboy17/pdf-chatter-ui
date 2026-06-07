import ssl


def system_ssl_context() -> ssl.SSLContext:
    return ssl.create_default_context()
