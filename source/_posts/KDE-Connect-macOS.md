---
title: Connect your Android phone with your Mac via KDE Connect
date: 2019-07-16 11:57:22
tags:
- KDE Connect
- macOS
- GSoC
categories:
- [KDE Connect, macOS]
---

Have you ever heard [Continuity](https://www.apple.com/macos/continuity/), the solution of Apple which provides one seamless experience between your iPhone and your Mac?

{% asset_img apple-continuity.png Apple Continuity %}

You may be surprised, "Woohoo, it's amazing but I use my OnePlus along with my Mac." With my GSoC 2019 project, you can connect your Mac and your Android phone with `KDE Connect`!

And you can even connect your Mac with your Linux PC or Windows PC (Thanks to Piyush, he is working on optimizing experience of `KDE Connect` on Windows).

# Installation instruction

1. You can download `KDE Connect` Nightly Build for macOS from KDE Binary Factory: [https://binary-factory.kde.org/view/MacOS/job/kdeconnect-kde_Nightly_macos/](https://binary-factory.kde.org/view/MacOS/job/kdeconnect-kde_Nightly_macos/). But notice that it's not yet a stable version, and it requires that you have permission to run application from non-certificated developer. We'll release a stable one next month on August.

2. Otherwise you can build your own version. Please follow the instructions on [KDE Connect Wiki](https://community.kde.org/KDEConnect/Build_MacOS). If you're using `macOS 10.13`, `MacOS X 10.12` or below, we recommend that you build your own `KDE Connect` because our Binary Factory are building applications for only `macOS 10.14` or above.

You'll finally get a `DMG` image file in both 2 ways.

{% asset_img dmg.png KDE Connect DMG image %}

Just click on it, mount it and drap `kdeconnect-indicator` into `Applications` folder. 

Open `kdeconnect-indicator` and your magic journal with `KDE Connect` for macOS begins!

# Use

After installation, you can see an icon of `kdeconnect-indicator` in the Launchpad.

{% asset_img launchpad.png KDE Connect in LaunchPad %}

Click it to open. If everything is ok, you will see an `KDE Connect` icon in your system tray.

{% asset_img trayicon.png KDE Connect in System Tray %}

Click the icon -> Configure to open configuration window. Here you can see discovered devices and paired devices.

{% asset_img configuration.png KDE Connect Configuration Window %}

You can enable or disable functions in this window.

Currently, you can do these from your Android phone:
- Run predefined commands on your Mac from connected devices.
- Check your phones battery level from the desktop
- Ring your phone to help finding it
- Share files and links between devices
- Control the volume of your Mac from the phone
- Keep your Mac awake when your phone is connected
- Receive your phone notifications on your desktop computer (this function is achieved but not yet delivered, you can follow another article to enable it manually)

I'm trying to make more plugins work on macOS. Good luck to my GSoC project :)

# Acknowledgement

Thanks to KDE Community and Google, I could start this Google Summer of Code project this summer.

Thanks to members in KDE Connect development. Without them, I cannnot understand the mechanism and get it work on macOS so quickly :)

# Conclusion
If you have any question, [KDE Connect Wiki](https://community.kde.org/KDEConnect) may be helpful. And you can find a bug tracker there.

Don't be hesitated to join our Telegram Group or IRC channel if you'd like to bring more exciting functions into `KDE Connect`: 

- [Telegram](https://t.me/joinchat/BRUUN0bwMhNfn8FIejA-nw)
- IRC (#kdeconnect)
- matrix.org (#freenode_#kdeconnect:matrix.org)

I wish you could enjoy the seamless experience provided by `KDE Connect` for macOS and your Android Phone!
