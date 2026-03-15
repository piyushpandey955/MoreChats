"""Legacy notifications module.

External webhook notifications were removed from the app.
This file is kept only as a no-op compatibility shim.
"""


def send_reply_notification(*_args, **_kwargs):
    return None


def send_discovery_summary(*_args, **_kwargs):
    return None
