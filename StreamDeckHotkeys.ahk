SendMode Input  ; Recommended for new scripts due to its superior speed and reliability.
SetWorkingDir %A_ScriptDir%  ; Ensures a consistent starting directory.
Numpad8::
Run node .\run-scripts.js marker,,Hide
return