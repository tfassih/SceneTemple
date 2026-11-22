[Setup]
AppId={{A678E2DF-E229-498B-8E46-FED6D934CFB8}
AppName=SceneTemple
AppVersion={#AppVersion}
AppPublisher=SceneTemple
AppPublisherURL=https://github.com/tfassih/SceneTemple
DefaultDirName={localappdata}\Programs\SceneTemple
DefaultGroupName=SceneTemple
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
Compression=lzma2/normal
SolidCompression=yes
WizardStyle=modern
DisableProgramGroupPage=yes
OutputDir={#ArtifactDir}
OutputBaseFilename=SceneTemple-{#AppVersion}-Windows-x64-Setup
SetupIconFile={#SourceDir}\resources\app\desktop\icon.ico
UninstallDisplayIcon={app}\resources\app\desktop\icon.ico
ChangesAssociations=yes
CloseApplications=yes
[Files]
Source: "{#SourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
[Icons]
Name: "{group}\SceneTemple"; Filename: "{app}\SceneTemple.exe"; IconFilename: "{app}\resources\app\desktop\icon.ico"
[Registry]
Root: HKCU; Subkey: "Software\Classes\.scenetemple\OpenWithProgids"; ValueType: none; ValueName: "SceneTemple.Project"; Flags: uninsdeletevalue
Root: HKCU; Subkey: "Software\Classes\SceneTemple.Project"; ValueType: string; ValueData: "SceneTemple project"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Classes\SceneTemple.Project\DefaultIcon"; ValueType: string; ValueData: "{app}\resources\app\desktop\icon.ico,0"
Root: HKCU; Subkey: "Software\Classes\SceneTemple.Project\shell\open\command"; ValueType: string; ValueData: """{app}\SceneTemple.exe"" ""%1"""
[Run]
Filename: "{app}\SceneTemple.exe"; Description: "Open SceneTemple"; Flags: postinstall nowait skipifsilent
