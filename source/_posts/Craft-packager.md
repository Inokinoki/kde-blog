---
title: KDE Craft Packager on macOS 
date: 2019-05-26 21:57:22
tags:
- Craft
categories:
- [Craft, Package]
---

In Craft, to create a package, we can use `craft --package <blueprint-name>` after the compiling and the installing of a library or an application with given blueprint name.

On macOS, `MacDMGPackager` is the packager used by Craft. The `MacDylibBundler`is used in `MacDMGPackager` to handle the dependencies.

In this article, I'll give a brief introduction of the two classes and the improvement which I've done for my GSoC project.

# MacDMGPackager

`MacDMGPackager` is a subclass of `CollectionPackagerBase`. Its most important method is `createPackage`.

First of all, 

```python
self.internalCreatePackage(seperateSymbolFiles=packageSymbols)
```

## Initialisation of directory variables

Here we get the definitions, the path of the application which we want to pack, and the path of archive.
The `appPath` should be the root of an application package with `.app` extension name. According to the convention of applications on macOS, `targetLibdir` points to the library directory of the application. 
During the compiling and the installing period, in the application directory, there is only a `.plist` and `MacOS` subdirectory. So next, the library directory is created for further using.

```python
defines = self.setDefaults(self.defines)
appPath = self.getMacAppPath(defines)
archive = os.path.normpath(self.archiveDir())
# ...
targetLibdir = os.path.join(appPath, "Contents", "Frameworks")
utils.createDir(targetLibdir)
```

## Moving files to correct directories

Then, we predefine a list of pairs of source and destination for directories and move the files to the destinations. The destionations are the correct directories of libraries, plugins and resources in a macOS application package.

```python
moveTargets = [
    (os.path.join(archive, "lib", "plugins"), os.path.join(appPath, "Contents", "PlugIns")),
    (os.path.join(archive, "plugins"), os.path.join(appPath, "Contents", "PlugIns")),
    (os.path.join(archive, "lib"), targetLibdir),
    (os.path.join(archive, "share"), os.path.join(appPath, "Contents", "Resources"))]

if not appPath.startswith(archive):
    moveTargets += [(os.path.join(archive, "bin"), os.path.join(appPath, "Contents", "MacOS"))]

for src, dest in moveTargets:
    if os.path.exists(src):
        if not utils.mergeTree(src, dest):
            return False
```

## Fixing dependencies using MacDylibBundler

After the moving, we create an instance of `MacDylibBundler` with `appPath`. After the `with` instruction, all the codes are executed with `DYLD_FALLBACK_LIBRARY_PATH=<package.app>/Contents/Frameworks:<Craft-Root>/lib` environment variable.

For further reading of this environment variable, please refer this question on [StackOverFlow](https://stackoverflow.com/questions/3146274/is-it-ok-to-use-dyld-library-path-on-mac-os-x-and-whats-the-dynamic-library-s).

```python
dylibbundler = MacDylibBundler(appPath)
with utils.ScopedEnv({'DYLD_FALLBACK_LIBRARY_PATH': targetLibdir + ":" + os.path.join(CraftStandardDirs.craftRoot(), "lib")}):
    # ...
```

### Fixing dependencies of main binary

Here, we firstly create an object of Path. It points to the executable of macOS Package.

It should be reminded that, although here, we use the same name for both the macOS application package and the executable, it is not mandatory. The name of executable is defined by `CFBundleExecutable` in the `.plist` file. So maybe read it from the `.plist` file is a better solution.

Then, the method `bundleLibraryDependencies` is used to copy libraries and fix dependencies for the executable in the package.

A brief introduction of this method:
1. Call `utils.getLibraryDeps` for getting a list of dependencies. This operation is done by using `otool -L`.
2. Copy missing dependencies into `Contents/Frameworks`, and update the library information in the executable.
I'll give an analyse in detail in the next chapter.

```python
CraftCore.log.info("Bundling main binary dependencies...")
mainBinary = Path(appPath, "Contents", "MacOS", defines['appname'])
if not dylibbundler.bundleLibraryDependencies(mainBinary):
    return False
```

### Fixing dependencies in Frameworks and PlugIns

And then, we try to fix all the dependencies of libraries in `Contents/Frameworks` and `Contents/PlugIns`.

```python
# Fix up the library dependencies of files in Contents/Frameworks/
CraftCore.log.info("Bundling library dependencies...")
if not dylibbundler.fixupAndBundleLibsRecursively("Contents/Frameworks"):
    return False
CraftCore.log.info("Bundling plugin dependencies...")
if not dylibbundler.fixupAndBundleLibsRecursively("Contents/PlugIns"):
    return False
```

### Fixing dependencies using macdeployqt

The `macdeployqt` is used to fix the `Qt` libraries used by the application. `Craft` installed it while compiling and installing `Qt`. But don't worry, it is not in your system path.

I have not yet found what `macdeployqt` exactly do, it's nice to have an look at its source code.

```python
if not utils.system(["macdeployqt", appPath, "-always-overwrite", "-verbose=1"]):
    return False
```

### Removing files in blacklist

If `macdeplyqt` added some files which we don't want, they would be removed here.

```python
# macdeployqt might just have added some explicitly blacklisted files
blackList = Path(self.packageDir(), "mac_blacklist.txt")
if blackList.exists():
    pattern = [self.read_blacklist(str(blackList))]
    # use it as whitelist as we want only matches, ignore all others
    matches = utils.filterDirectoryContent(appPath, whitelist=lambda x, root: utils.regexFileFilter(x, root, pattern), blacklist=lambda x, root:True)
    for f in matches:
        CraftCore.log.info(f"Remove blacklisted file: {f}")
        utils.deleteFile(f)
```

### Fixing dependencies after fixing of macdeployqt

After `macdeplotqt`, there may be some libraries or plugins added by `macdeplotqt`. So we do the fixing of dependencies once again.

But I'm doubting if we need to fix twice the dependencies. I'll update this post after I figure out what will it lead to if we fust fix after `macdeployqt`.

```python
# macdeployqt adds some more plugins so we fix the plugins after calling macdeployqt
dylibbundler.checkedLibs = set()  # ensure we check all libs again (but
# we should not need to make any changes)
CraftCore.log.info("Fixing plugin dependencies after macdeployqt...")
if not dylibbundler.fixupAndBundleLibsRecursively("Contents/PlugIns"):
    return False
CraftCore.log.info("Fixing library dependencies after macdeployqt...")
if not dylibbundler.fixupAndBundleLibsRecursively("Contents/Frameworks"):
    return False
```

### Checking dependencies

Then, we use `MacDylibBundler` to check all dependencies in the application package. If there is any bad dependency, the package process will fail.

```python
# Finally sanity check that we don't depend on absolute paths from the builder
CraftCore.log.info("Checking for absolute library paths in package...")
found_bad_dylib = False  # Don't exit immeditately so that we log all the bad libraries before failing:
if not dylibbundler.areLibraryDepsOkay(mainBinary):
    found_bad_dylib = True
    CraftCore.log.error("Found bad library dependency in main binary %s", mainBinary)
if not dylibbundler.checkLibraryDepsRecursively("Contents/Frameworks"):
    CraftCore.log.error("Found bad library dependency in bundled libraries")
    found_bad_dylib = True
if not dylibbundler.checkLibraryDepsRecursively("Contents/PlugIns"):
    CraftCore.log.error("Found bad library dependency in bundled plugins")
    found_bad_dylib = True
if found_bad_dylib:
    CraftCore.log.error("Cannot not create .dmg since the .app contains a bad library depenency!")
    return False
```

## Creating DMG image

Up to now, everything is well, we can create a DMG image for the application.

```python
name = self.binaryArchiveName(fileType="", includeRevision=True)
dmgDest = os.path.join(self.packageDestinationDir(), f"{name}.dmg")
if os.path.exists(dmgDest):
    utils.deleteFile(dmgDest)
appName = defines['appname'] + ".app"
if not utils.system(["create-dmg", "--volname", name,
                        # Add a drop link to /Applications:
                        "--icon", appName, "140", "150", "--app-drop-link", "350", "150",
                        dmgDest, appPath]):
    return False

CraftHash.createDigestFiles(dmgDest)

return True
```

An example of `DMG` image is like this one, users can drag the application into `Applications` directory to install it.

{% asset_img DMG-example.png a DMG file %}

# MacDylibBundler

## Constructor
```python
def __init__(self, appPath: str):
    # Avoid processing the same file more than once
    self.checkedLibs = set()
    self.appPath = appPath
```

In the constructor, a set is created to store the libraries which have been already checked. And the `appPath` passed by developer is stored.

# Methods
This method `bundleLibraryDependencies` and `_addLibToAppImage` are the most important methods in this class. But they're too long. So I'll only give some brief introduction of them.

`_addLibToAppImage` checks whether a library is already in the `Contents/Frameworks`. If the library doesn't exist, it copies it into the diretory and tries to fix it with some relative path.

```python
def _addLibToAppImage(self, libPath: Path) -> bool:
    # ...
```

`bundleLibraryDependencies` checks the dependencies of `fileToFix`. If there are some dependencies with absolute path, it copies the dependencies into `Contents/Frameworks` by calling `_addLibToAppImage`. And then, it calls `_updateLibraryReference` to update the reference of library.

```python
def bundleLibraryDependencies(self, fileToFix: Path) -> bool:
    # ...
```

As description in the docstring, `fixupAndBundleLibsRecursively` can remove absolute references and budle all depedencies for all dylibs.

It traverses the directory, and for each file which is not symbol link, checks whether it ends with ".so" or ".dylib", or there is ".so." in the file name, or there is ".framework" in the full path and it's a macOS binary. If it's that case, call `bundleLibraryDependencies` method to bundle it in to `.app` package.

```python
def fixupAndBundleLibsRecursively(self, subdir: str):
    """Remove absolute references and budle all depedencies for all dylibs under :p subdir"""
    # ...
    for dirpath, dirs, files in os.walk(os.path.join(self.appPath, subdir)):
            for filename in files:
                fullpath = Path(dirpath, filename)
                if fullpath.is_symlink():
                    continue  # No need to update symlinks since we will process the target eventually.
                if (filename.endswith(".so")
                        or filename.endswith(".dylib")
                        or ".so." in filename
                        or (f"{fullpath.name}.framework" in str(fullpath) and utils.isBinary(str(fullpath)))):
                    if not self.bundleLibraryDependencies(fullpath):
                        CraftCore.log.info("Failed to bundle dependencies for '%s'", os.path.join(dirpath, filename))
                        return False
    # ...
```

`areLibraryDepsOkay` can detect all the dependencies. If the library is not in `@rpath`, `@executable_path` or system library path, the dependencies cannot be satisfied on every mac. It may work relevant to the environment. But it will be a big problem.

```python
def areLibraryDepsOkay(self, fullPath: Path):
    # ...
    for dep in utils.getLibraryDeps(str(fullPath)):
        if dep == libraryId and not os.path.isabs(libraryId):
            continue  # non-absolute library id is fine
        # @rpath and @executable_path is fine
        if dep.startswith("@rpath") or dep.startswith("@executable_path"):
            continue
        # Also allow /System/Library/Frameworks/ and /usr/lib:
        if dep.startswith("/usr/lib/") or dep.startswith("/System/Library/Frameworks/"):
            continue
        if dep.startswith(CraftStandardDirs.craftRoot()):
            CraftCore.log.error("ERROR: %s references absolute library path from craftroot: %s", relativePath,
                                dep)
        elif dep.startswith("/"):
            CraftCore.log.error("ERROR: %s references absolute library path: %s", relativePath, dep)
        else:
            CraftCore.log.error("ERROR: %s has bad dependency: %s", relativePath, dep)
        found_bad_lib = True
```

Here, in `checkLibraryDepsRecursively`, we traverse the directory to check all the dependencies of libraries, which is `.dylib` or `.so`.

```python
def checkLibraryDepsRecursively(self, subdir: str):
    # ...
    for dirpath, dirs, files in os.walk(os.path.join(self.appPath, subdir)):
        for filename in files:
            fullpath = Path(dirpath, filename)
            if fullpath.is_symlink() and not fullpath.exists():
                CraftCore.log.error("Found broken symlink '%s' (%s)", fullpath,
                                    os.readlink(str(fullpath)))
                foundError = True
                continue

            if filename.endswith(".so") or filename.endswith(".dylib") or ".so." in filename:
                if not self.areLibraryDepsOkay(fullpath):
                    CraftCore.log.error("Found library dependency error in '%s'", fullpath)
                    foundError = True
    # ...
```

## Static methods in class

The `_updateLibraryReference` method can use `install_name_tool -change` command to change a reference of dynamic library in a macOS/BSD binary.

```python
@staticmethod
def _updateLibraryReference(fileToFix: Path, oldRef: str, newRef: str = None) -> bool:
    if newRef is None:
        basename = os.path.basename(oldRef)
        newRef = "@executable_path/../Frameworks/" + basename
    with utils.makeWritable(fileToFix):
        if not utils.system(["install_name_tool", "-change", oldRef, newRef, str(fileToFix)], logCommand=False):
            CraftCore.log.error("%s: failed to update library dependency path from '%s' to '%s'",
                                fileToFix, oldRef, newRef)
            return False
    return True
```

The `_getLibraryNameId` method can use `otool -D` to get the identity of a dynamic library in a macOS/BSD binary.

```python
@staticmethod
def _getLibraryNameId(fileToFix: Path) -> str:
    libraryIdOutput = io.StringIO(
        subprocess.check_output(["otool", "-D", str(fileToFix)]).decode("utf-8").strip())
    lines = libraryIdOutput.readlines()
    if len(lines) == 1:
        return ""
    # Should have exactly one line with the id now
    assert len(lines) == 2, lines
    return lines[1].strip()
```

The `_fixupLibraryId` method can use `install_name_tool -id` to try to fix the absolute identity of a dynamic library in a macOS/BSD binary.

```python
@classmethod
def _fixupLibraryId(cls, fileToFix: Path):
    libraryId = cls._getLibraryNameId(fileToFix)
    if libraryId and os.path.isabs(libraryId):
        CraftCore.log.debug("Fixing library id name for %s", libraryId)
        with utils.makeWritable(fileToFix):
            if not utils.system(["install_name_tool", "-id", os.path.basename(libraryId), str(fileToFix)],
                                logCommand=False):
                CraftCore.log.error("%s: failed to fix absolute library id name for", fileToFix)
                return False
    # ...
```

## Conclusion

This class is a magic class which can achieve almost everything on macOS.

But the code style is a little confusing. And the parameters are not agreed. Some methods use `str` to represent a path, some use `Path`.

Maybe this can be also improved in the future.

Anyway, it's really a helpful class.

# Improvement

During my bonding period, I found that there is a library named `qca-qt5` is not fixed appropriately. It caused a crash.

## Locating the problem

After analyzing of crash log, I found that the library `qca-qt5` is loaded twice. Two libraries with same dynamic library id caused this crash.
```
qca-qt5 (0) <14AD33D7-196F-32BB-91B6-598FA39EEF20> /Volumes/*/kdeconnect-indicator.app/Contents/Frameworks/qca-qt5
(??? - ???) <14AD33D7-196F-32BB-91B6-598FA39EEF20> /Users/USER/*/qca-qt5.framework/Versions/2.2.0/qca-qt5
```

One is in the `.app` package, the other is in `CraftRoot/lib`.

{% asset_img Craft-lib.png Craft/lib %}

{% asset_img Frameworks-lib.png Frameworks %}

As far as I know, `qca-qt5` tried to search its plugins in some path. The one in the package is not fixed, so it started a searching of plugins in the `CraftRoot/lib` directory. The plugins in it refer the `qca-qt5` in the directory. So the two libraries with the same name are loaded, and the application crashed.

## Cause
With good knowing of `MacDylibBundler`, we can improve it to fix the bug. And this will be helpful to other applications or libraries in `Craft`.

I noticed that all the libraries with `.dylib` can be handled correctly. The problem is based on the libraries in the `.framework` package. It seems that `Craft` cannot handle the dynamic libraries in the `.framework` correctly.

And we can see that, in `checkLibraryDepsRecursively`, only `.so` and `.dylib` are checked. So this is a bug covered deeply.

```
CRAFT: ➜  MacOS otool -L kdeconnectd
kdeconnectd:
	/Volumes/Storage/Inoki/CraftRoot/lib/libkdeconnectcore.1.dylib (compatibility version 1.0.0, current version 1.3.3)
	/Volumes/Storage/Inoki/CraftRoot/lib/libKF5KIOWidgets.5.dylib (compatibility version 5.0.0, current version 5.57.0)
	/Volumes/Storage/Inoki/CraftRoot/lib/libKF5Notifications.5.dylib (compatibility version 5.0.0, current version 5.57.0)
	/Volumes/Storage/Inoki/CraftRoot/lib/qca-qt5.framework Versions/2.2.0/qca-qt5 (compatibility version 2.0.0, current version 2.2.0)
    ...
```

In the `_addLibToAppImage` method, the library in the `framework` is copied directly to the `Contents/Frameworks`. For example, `lib/qca-qt5.framework/Versions/2.2.0/qca-qt5` becomes `Contents/Frameworks/qca-qt5`.

And then, during the fix in `fixupAndBundleLibsRecursively` method, according to the following code, it will not be fixed. Although it should be in a `.framework` directory and it's a binary, after `_addLibToAppImage`, it will not be in a `.framework` directory. So it will not be fixed.
```python
if (filename.endswith(".so")
        or filename.endswith(".dylib")
        or ".so." in filename
        or (f"{fullpath.name}.framework" in str(fullpath) and utils.isBinary(str(fullpath)))):
    if not self.bundleLibraryDependencies(fullpath):
        CraftCore.log.info("Failed to bundle dependencies for '%s'", os.path.join(dirpath, filename))
        return False
```

## Fixing it !

To fix it, I think a good idea is copying all the `.framework` directory and keeping its structure.

I firstly do a checking in the `_addLibToAppImage` method. For example, if `qca-qt5` is in the `qca-qt5.framework` subdirectory, we change the `libBasename` to `qca-qt5.framework/Versions/2.2.0/qca-qt5`. So the `targetPath` can also be updated correctly.

```python
libBasename = libPath.name

# Handle dylib in framework
if f"{libPath.name}.framework" in str(libPath):
    libBasename = str(libPath)[str(libPath).find(f"{libPath.name}.framework"):]

targetPath = Path(self.appPath, "Contents/Frameworks/", libBasename)
if targetPath.exists() and targetPath in self.checkedLibs:
    return True
```

After several checkings, an important section is copying the library. I add some code to check if the library is in a `.framework` directory. If a library is in a `.framework` directory, I try to copy the entire directory to the `Contents/Frameworks`. So for `qca-qt5`, it should be `Contents/Frameworks/qca-qt5.framework/Versions/2.2.0/qca-qt5`.

```python
if not targetPath.exists():
    if f"{libPath.name}.framework" in str(libPath):
        # Copy the framework of dylib
        frameworkPath = str(libPath)[:(str(libPath).find(".framework") + len(".framework"))]
        frameworkTargetPath = str(targetPath)[:(str(targetPath).find(".framework") + len(".framework"))]
        utils.copyDir(frameworkPath, frameworkTargetPath, linkOnly=False)
        CraftCore.log.info("Added library dependency '%s' to bundle -> %s", frameworkPath, frameworkTargetPath)
    else:
        utils.copyFile(str(libPath), str(targetPath), linkOnly=False)
        CraftCore.log.info("Added library dependency '%s' to bundle -> %s", libPath, targetPath)
```

After copying, another important point is in `_updateLibraryReference`. If a library is in a `.framework` directory, the new reference should be `@executable_path/../Frameworks/*.framework/...`.

```python
if newRef is None:
    basename = os.path.basename(oldRef)
    if f"{basename}.framework" in oldRef:
        # Update dylib in framework
        newRef = "@executable_path/../Frameworks/" + oldRef[oldRef.find(f"{basename}.framework"):]
    else:
        newRef = "@executable_path/../Frameworks/" + basename
```

After fixing, the executable can be launched without crash.

```bash
CRAFT: ➜  MacOS otool -L kdeconnectd
kdeconnectd:
	@executable_path/../Frameworks/libkdeconnectcore.1.dylib (compatibility version 1.0.0, current version 1.3.3)
	@executable_path/../Frameworks/libKF5KIOWidgets.5.dylib (compatibility version 5.0.0, current version 5.57.0)
	@executable_path/../Frameworks/libKF5Notifications.5.dylib (compatibility version 5.0.0, current version 5.57.0)
	@executable_path/../Frameworks/qca-qt5.framework/Versions/2.2.0/qca-qt5 (compatibility version 2.0.0, current version 2.2.0)
    ...
CRAFT: ➜  MacOS ./kdeconnectd
kdeconnect.core: KdeConnect daemon starting
kdeconnect.core: onStart
kdeconnect.core: KdeConnect daemon started
kdeconnect.core: Broadcasting identity packet
```

# Conclusion

In the software development, there are always some cases which we cannot consider. Open Source gives us the possibility of collecting intelligence from people all over the world to handle such cases.

That's also why I like Open Source so much.

Today is the first day of coding period, I hope all goes well for the community and all GSoC students :)
