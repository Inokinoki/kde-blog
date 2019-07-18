---
title: Enable notification plugin in KDE Connect on macOS
date: 2019-07-18 14:09:22
tags:
- KDE Connect
- macOS
- GSoC
categories:
- [KDE Connect, macOS]
---

You may have tried KDE Connect for macOS. 

If you've not yet tried KDE Connect, you can read my post: [Connect your Android phone with your Mac via KDE Connect](/2019/07/16/KDE-Connect-macOS/)

As I mentioned, this post will help you to build your own KDE Connect with native Notification support for macOS.

{% asset_img notification-preview.gif Notification Preview %}

# Build
This post will not give you instructions of building KDE Connect on macOS because there is already a page on [KDE Connect Wiki](https://community.kde.org/KDEConnect/Build_MacOS)

If you met any problems, you can submit them on our [KDE bug tracker](https://bugs.kde.org/enter_bug.cgi?product=kdeconnect)

# Add notification support

Notification plugin depends on `KNotification`. There is no native support for macOS in this library. 

I've made a native one and it has been submited as a patch. But it takes time to get reviewed and optimized.

I keep the patch available on a repo of my GitHub:
[https://github.com/Inokinoki/knotifications](https://github.com/Inokinoki/knotifications). So, `Craft` can access it and compile it to provide support of macOS Notification.

But we're looking forward to its delivery in `KNotification`.

What you need to do is very simple:

1. Find KNotifications blueprint file
- Enter your `CraftRoot` folder. To me, it's `/Users/inoki/CraftRoot`. 
- Enter `etc` -> `blueprints` -> `locations` -> `craft-blueprints-kde` folder.
- Open `kde/frameworks/tier3/knotifications/knotifications.py`.

2. Remove `self.versionInfo.setDefaultValues()` in `setTargets` of `subinfo` class. If you're not familiar with `python`, just find this line and delete it.
```python
self.versionInfo.setDefaultValues()
```

3. Add these 2 lines:
```python
self.svnTargets['master'] = 'https://github.com/Inokinoki/knotifications.git'
self.defaultTarget = 'master'
```

The file should look like this:

{% asset_img preview.png knotification blueprint preview %}


After that, rebuild KDE Connect with Craft.

If everything is ok, launch your KDE Connect.

You could receive notifications from your phone or your other computers(if well configured), just like this:

{% asset_img notification.png Test Notification %}

You can also change notification settings of KDE Connect in your macOS Notification Center. By default, the notification style is `Bar`, set it to `Alert` to see quick actions to your notifications.

#### Notice: Currently there is a bug, you may receive duplicated notifications. We're figuring out its reason and it will be fixed as soon as possible.

Thanks for your reading and your support to KDE Connect :)

If you'd like to, you can also follow me on GitHub :)

# For pros

For developers, if you're familiar with diff, just apply this diff patch:
```diff
diff --git a/kde/frameworks/tier3/knotifications/knotifications.py b/kde/frameworks/tier3/knotifications/knotifications.py
index 9b46044..f5c82a4 100644
--- a/kde/frameworks/tier3/knotifications/knotifications.py
+++ b/kde/frameworks/tier3/knotifications/knotifications.py
@@ -3,7 +3,8 @@ import info
 
 class subinfo(info.infoclass):
     def setTargets(self):
-        self.versionInfo.setDefaultValues()
+        self.svnTargets['master'] = 'https://github.com/Inokinoki/knotifications.git'
+        self.defaultTarget = 'master'
         self.patchToApply['5.57.0'] = [("disabled-deprecated-before.patch", 1)]
 
         self.description = "TODO"
```




