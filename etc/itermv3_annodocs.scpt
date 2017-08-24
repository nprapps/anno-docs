tell application "iTerm2"
    tell current window
        tell current session
            -- anno-docs tool pane
            set name to "anno-docs"
            set server to (split vertically with default profile)
            -- CHANGE path to your needs
            write text "cd ~/npr/projects/anno-docs/"
            write text "workon anno-docs"
            write text "git pull"
        end tell
        tell server
            -- server pane
            set name to "server"
            set daemon to (split horizontally with default profile)
            -- CHANGE path to your needs
            write text "cd ~/npr/projects/anno-docs/"
            write text "workon anno-docs"
            write text "fab app:7777"
        end tell
        tell daemon
            -- daemon pane
            set name to "daemon"
            -- CHANGE path to your needs
            write text "cd ~/npr/projects/anno-docs/"
            write text "workon anno-docs"
            write text "fab daemons.main"
        end tell
    end tell
end tell
