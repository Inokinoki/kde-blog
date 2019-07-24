---
title: DBus connection on macOS 
date: 2019-07-24 14:55:00
tags:
- macOS
- DBus
categories:
- macOS
---

# What is DBus
DBus is a concept of software bus, an inter-process communication (IPC), and a remote procedure call (RPC) mechanism that allows communication between multiple computer programs (that is, processes) concurrently running on the same machine. DBus was developed as part of the freedesktop.org project, initiated by Havoc Pennington from Red Hat to standardize services provided by Linux desktop environments such as GNOME and KDE.

In this post, we only talk about how does DBus daemon run and how KDE Applications/Frameworks connect to it. For more details of DBus itself, please move to [DBus Wiki](https://www.freedesktop.org/wiki/Software/dbus/).

# QDBus

There are two types of bus: `session` bus and `system` bus. The user-end applications should use `session` bus for IPC or RPC.

For the DBus connection, there is already a good enough library named QDBus provided by Qt. Qt framework and especially QDBus is widely used in KDE Applications and Frameworks on Linux.

A mostly used function is `QDBusConnection::sessionBus()` to establish a connection to default session DBus. All DBus connection are established through this function.

Its implementation is:
```c++
QDBusConnection QDBusConnection::sessionBus()
{
    if (_q_manager.isDestroyed())
        return QDBusConnection(nullptr);
    return QDBusConnection(_q_manager()->busConnection(SessionBus));
}
```

where `_q_manager` is an instance of `QDBusConnectionManager`.

`QDBusConnectionManager` is a private class so that we don't know what exactly happens in the implementation.

The code can be found in [qtbase](https://github.com/qt/qtbase/blob/589d96b9b06a4a7d0dca03a06c80716318761277/src/dbus/qdbusconnection.cpp#L1175).

# DBus connection on macOS

On macOS, we don't have a pre-installed dbus. When we compile it from source code, or install it from HomeBrew or somewhere, a configuration file `session.conf` and a `launchd` configuration file `org.freedesktop.dbus-session.plist` are delivered and expected to install into the system.

## session.conf
In `session.conf`, one important thing is `<listen>launchd:env=DBUS_LAUNCHD_SESSION_BUS_SOCKET</listen>`, which means socket path should be provided by `launchd` through the environment `DBUS_LAUNCHD_SESSION_BUS_SOCKET`.

## org.freedesktop.dbus-session.plist

On macOS, `launchd` is a unified operating system service management framework, starts, stops and manages daemons, applications, processes, and scripts. Just like `systemd` on Linux.

The file `org.freedesktop.dbus-session.plist` describes how `launchd` can find a daemon executable, the arguments to launch it, and the socket to communicate after launching daemon.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>Label</key>
	<string>org.freedesktop.dbus-session</string>

	<key>ProgramArguments</key>
	<array>
		<string>/{DBus install path}/bin/dbus-daemon</string>
		<string>--nofork</string>
		<string>--session</string>
	</array>

	<key>Sockets</key>
	<dict>
		<key>unix_domain_listener</key>
		<dict>
			<key>SecureSocketWithKey</key>
			<string>DBUS_LAUNCHD_SESSION_BUS_SOCKET</string>
		</dict>
	</dict>
</dict>
</plist>
```

Once the daemon is successfully launched by `launchd`, the socket will be provided in `DBUS_LAUNCHD_SESSION_BUS_SOCKET` env of `launchd`.

We can get it with following command:
```bash
launchctl getenv DBUS_LAUNCHD_SESSION_BUS_SOCKET
```

# Current solution in KDE Connect

KDE Connect needs urgently DBus to make, the communication between `kdeconenctd` and `kdeconnect-indicator` or other components, possible.

## First try

Currently, we delivered `dbus-daemon` in the package, and run

```bash
./Contents/MacOS/dbus-daemon --config-file=./Contents/Resources/dbus-1/session.conf --print-address --nofork --address=unix:tmpdir=/tmp
```

`--address=unix:tmpdir=/tmp` provides a base directory to store a random unix socket descriptor. So we could have serveral instances at the same time, with different addresse.

`--print-address` can let `dbus-daemon` write its generated, real address into standard output. 

Then we redirect the output of `dbus-daemon` to 
`KdeConnectConfig::instance()->privateDBusAddressPath()`. Normally, it should be `$HOME/Library/Preferences/kdeconnect/private_dbus_address`. For example, the address in it is `unix:path=/tmp/dbus-K0TrkEKiEB,guid=27b519a52f4f9abdcb8848165d3733a6`.

Therefore, our program can access this file to get the real DBus address, and use another function in QDBus to connect to it:
```c++
QDBusConnection::connectToBus(KdeConnectConfig::instance()->privateDBusAddress(), QStringLiteral(KDECONNECT_PRIVATE_DBUS_NAME));
```

We redirect all `QDBusConnection::sessionBus` to `QDBusConnection::connectToBus` to connect to our own DBus.

## Fake a session DBus

With such solution, `kdeconnectd` and `kdeconnect-indicator` coworks well. But in KFrameworks, there are lots of components which are using `QDBusConnection::sessionBus` rather than `QDBusConnection::connectToBus`. We cannot change all of them.

Then I came up with an idea, try to **fake a session bus** on macOS.

To hack and validate, I tried to launch a `dbus-daemon` using `/tmp/dbus-K0TrkEKiEB` as address, and then I tried type this in my terminal:
```bash
launchctl setenv DBUS_LAUNCHD_SESSION_BUS_SOCKET /tmp/dbus-K0TrkEKiEB
```

Then I launched `dbus-monitor --session`. It did connect to the bus that I launched.

And then, any `QDBusConnection::sessionBus` can establish a stable connection to the faked session bus. So components in KFramework can use the same session bus as well.

To implement it in KDE Connect, after starting `dbus-daemon`, I read the file content, filter the socket address, and call `launchctl` to set `DBUS_LAUNCHD_SESSION_BUS_SOCKET` env.

```c++
// Set launchctl env
QString privateDBusAddress = KdeConnectConfig::instance()->privateDBusAddress();
QRegularExpressionMatch path;
if (privateDBusAddress.contains(QRegularExpression(
        QStringLiteral("path=(?<path>/tmp/dbus-[A-Za-z0-9]+)")
    ), &path)) {
    qCDebug(KDECONNECT_CORE) << "DBus address: " << path.captured(QStringLiteral("path"));
    QProcess setLaunchdDBusEnv;
    setLaunchdDBusEnv.setProgram(QStringLiteral("launchctl"));
    setLaunchdDBusEnv.setArguments({
        QStringLiteral("setenv"),
        QStringLiteral(KDECONNECT_SESSION_DBUS_LAUNCHD_ENV),
        path.captured(QStringLiteral("path"))
    });
    setLaunchdDBusEnv.start();
    setLaunchdDBusEnv.waitForFinished();
} else {
    qCDebug(KDECONNECT_CORE) << "Cannot get dbus address";
}
```

Then everything works!

## Possible improvement
1. Since we can directly use session bus, the redirect from `QDBusConnection::sessionBus` to `QDBusConnection::connectToBus` is not necessary anymore. Everyone can connect it in convenience.
2. Each time we launch `kdeconnectd`, a new `dbus-daemon` is launched and the environment in `launchctl` is overwritten. To improve this, we might detect whether there is already an available `dbus-daemon` through testing connectivity of returned `QDBusConnection::sessionBus`. This might be done by a bootstrap script.
3. It will be really nice if we can have a unified way for all KDE Applications on macOS.

# Conclusion
I'm looking forward to a general DBus solution for all KDE applications :)
