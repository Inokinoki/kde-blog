---
title: KDE Connect macOS Release
date: 2019-09-01 14:43:25
tags:
- KDE Connect
- macOS
- GSoC
categories:
- [KDE Connect, macOS]
---

Now it's the end of Google Summer of Code 2019. As my GSoC project, the port of KDE Connect on macOS has made great progress. You can find and download it in my [blog release page](https://github.com/Inokinoki/kde-blog/releases/tag/20190901).

**Note:** This post aims at presenting the features of KDE Connect which have been implemented on macOS. If you'd like to know more information, such as compilation of your own KDE Connect binary on macOS, please turn to another post in my post [Connect your Android phone with your Mac via KDE Connect](https://kde.inoki.cc/2019/07/16/KDE-Connect-macOS/). And if you're interested in what I've done during Google Summer of Code, my status report of Google Summer of Code is [HERE](https://community.kde.org/GSoC/2019/StatusReports/WeixuanXiao).

# Features

In this chapter, I'd like to give you a preview of all features, as well as how to configure to make some of functions work.

## Launch KDE Connect

First, we can click on KDE Connect application - the `kdeconnect-indicator.app` to open it.

{% asset_img KDEConnect-macOS-Launch.gif KDE Connect Launching %}

Then, we can open KDE Connect configuration window from the indicator in the tray bar of macOS. 

{% asset_img Kdeconnect-configuration.png KDE Connect Configuration Window %}

As you can see, this is the main page of KDE Connect. All available plugins are here, you can enable/disable or configure them. In addition, available devices will be listed on the left, you can choose them to pair/unpair with them/it.

## Functions

### Pair notification

{% asset_img KDEConnect-macOS-PairNotification.gif KDE Connect Pair notification %}

When you pair from your Andoid Phone, you should be able to receive a notification that shows the pair request. You can accept or reject it in the KDE Connect configuration window, or you can do it with KDE Connect indicator tray icon, there would be an entry for the pair request as well.

Otherwise, if you change the notification type of KDE Connect to `alert` in the system preference, you should also be able to do a quick action with the notification itself. Just as I showed in [Enable notification plugin in KDE Connect on macOS](https://kde.inoki.cc/2019/07/18/KDE-Connect-macOS-plugin-notification/).

Once paired, you can enjoy your adventure on macOS with KDE Connect!

### Clipboard synchronization

{% asset_img Kdeconnect-clipboard-sync.png KDE Connect Clipboard %}

The text that you copy on your Mac will be shared to your phone, and those you copy on your phone will be also synchronized to your Mac.

### Notification synchronization

{% asset_img Kdeconnect-notification.png KDE Connect Notification %}

With KNotifications support for macOS, you can receive notification from your Android phones and react to them. You can ping your Mac to test whether they are well connected.

### Sending file

{% asset_img KDEConnect-macOS-SendFile.gif KDE Connect Send file %}

Sharing your file on your Mac with your Android phone is also a basic feature. You could also send a file from your Android phone, by default, the file will be saved in the `Downloads` folder in your Mac.


### System Volume

{% asset_img KDEConnect-macOS-Volume.gif KDE Cnnect SFTP %}

You can control the system value of your Mac from your Android Phone remotely.

### SFTP

{% asset_img KDEConnect-macOS-SFTPBrowser.gif KDE Cnnect SFTP %}

With my SFTP browser, you can browse files in your Android Phone from your Mac, easily synchronize a file.

### SMS

{% asset_img KDEConnect-macOS-SMS.gif KDE Connect SMS %}

Thanks to SMS application of Simon Redman, sending and receiving SMS on your Mac are possible!

### Running command

{% asset_img KDEConnect-macOS-RunCommand.gif KDE Connect Run command %}

Run command from your Android phone. I believe that using AppleScript, more and more things that KDE Connect can do on macOS, will be discovered, maybe by you!

### Mouse and Keyboard

{% asset_img KDEConnect-macOS-OpenMouseKeyboard.gif KDE Connect Allow control %}

You should be able to use your Android phone as a temporary trackpad and a keyboard. But it needs your permission to allow your Android phone to do it on your Mac. The GIF above shows how to do that.

### Others

Except the functions shown above, you can also do these from your Android phone:
- Keep your Mac awake when your phone is connected
- Use your phone to control your slides during a presentation
- Check the battery level of your phone
- Ring your phone to help find it

And, you may have noticed that, in the screen capture, there are KDE Connect in dark mode and in light mode. Thanks to Qt, we are able to benefit it.

Furthermore, there is no doubt that more functions will be delivered and released in the future. We are all looking forward to them.

# Issues

There are some issues that we've known and we are trying to fix them.

{% asset_img Gatekeeper.jpg KDE Connect rejected by GateKeeper %}

The released application package isn't notarized and still has some lirary reference issues. So, it requires you to manually open it, if it's rejected by Gatekeeper(package validator on macOS), like that showed in the image above.

We'll try to fix all issues and make a release which you can run it without barricade.

# Acknowledgement

Thanks to KDE Community and Google, I could finish this Google Summer of Code project this summer.

Thanks to members in KDE Connect development. Without them, I cannnot understand the mechanism and get it work on macOS so quickly :)

# Conclusion
If you have any question, [KDE Connect Wiki](https://community.kde.org/KDEConnect) may be helpful. And you can find a bug tracker there.

Don't be hesitated to join our Telegram Group or IRC channel if you'd like to bring more exciting functions into `KDE Connect`: 

- [Telegram](https://t.me/joinchat/BRUUN0bwMhNfn8FIejA-nw)
- IRC (#kdeconnect)
- matrix.org (#freenode_#kdeconnect:matrix.org)

I wish you could enjoy the seamless experience provided by `KDE Connect` for macOS and your Android Phone!
