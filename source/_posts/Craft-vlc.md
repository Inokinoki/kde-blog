---
title: KDE Craft now delivers with vlc and libvlc on macOS
date: 2019-05-19 19:57:22
tags:
- Craft
categories:
- [Craft, Blueprints]
---

Lacking `VLC` and `libvlc` in `Craft`, `phonon-vlc` cannot be built successfully on macOS. It caused the failed building of `KDE Connect` in `Craft`.

As a small step of my `GSoC` project, I managed to build `KDE Connect` by removing the `phonon-vlc` dependency. But it's not a good solution. I should try to fix `phonon-vlc` building on macOS. So during the community bonding period, to know better the community and some important tools in the Community, I tried to fix `phonon-vlc`.

# Fixing phonon-vlc

At first, I installed `libVLC` in `MacPorts`. All Header files and libraries are installed into the system path. So theoretically, there should not be a problem of the building of `phonon-vlc`. But an error occurred:

{% asset_img phonon-vlc-link-error.png Phonon-vlc link error %}

We can figure that the compiling is ok, the error is just at the end, during the linking. The error message tells us there is no `QtDBus` lib. So to fix it, I made a small patch to add QtDBus manually in the CMakeLists file.

```diff
diff --git a/src/CMakeLists.txt b/src/CMakeLists.txt
index 47427b2..1cdb250 100644
--- a/src/CMakeLists.txt
+++ b/src/CMakeLists.txt
@@ -81,7 +81,7 @@ if(APPLE)
 endif(APPLE)
 
 automoc4_add_library(phonon_vlc MODULE ${phonon_vlc_SRCS})
-qt5_use_modules(phonon_vlc Core Widgets)
+qt5_use_modules(phonon_vlc Core Widgets DBus)
 
 set_target_properties(phonon_vlc PROPERTIES
     PREFIX ""
```

And it works well!

A small problem is that Hannah said she didn't get an error during linking. It may be something about Qt version. If someone gets some idea, welcome to [contact me](mailto:veyx.shaw@gmail.com).

My Qt version is `5.12.3`.

# Fixing VLC

To fix `VLC`, I tried to pack the `VLC` binary just like the one on `Windows`.

But unfortunately, in the `.app` package, the Header files are not completed. Comparing to Windows version, the entire `plugins` folder is missing.

{% asset_img vlc-windows-include.jpg Windows %}

{% asset_img vlc-mac-include.png macOS %}

So I made a patch for all those files. But the patch is too huge (25000 lines!). So it is not a good idea to merge it into master branch.

Thanks to Hannah, she has made a `libs/vlc` blueprint in the master branch, so in `Craft`, feel free to install it by running `craft libs/vlc`.

# Troubleshooting

If you cannot build `libs/vlc`, just like me, you can also choose the binary version `VLC` with Header files patch.

The patch of Headers for binary is too big. Adding it to the master branch is not a good idea. So I published it on my own repository:
[https://github.com/Inokinoki/craft-blueprints-inoki](https://github.com/Inokinoki/craft-blueprints-inoki)

To use it, run `craft --add-blueprint-repository https://github.com/inokinoki/craft-blueprints-inoki.git` and the blueprint(s) will be added into your local blueprint directory.

Then, `craft binary/vlc` will help get the vlc binary and install Header files, libraries into `Craft` include path and lib path. Finally, you can build what you want with `libvlc` dependency.

# Conclusion

Up to now, `KDE Connect` is using `QtMultimedia` rather than `phonon` and `phonon-vlc` to play a sound. But this work could be also useful for other applications or libraries who depend on `phonon`, `phonon-vlc` or `vlc`. This small step may help build them successfully on macOS.

I hope this can help someone!
