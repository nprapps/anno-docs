tell application "iTerm2"
    tell current window
        tell current session
            -- debates tool pane
            set name to "debates"
            set server to (split vertically with default profile)
            -- CHANGE path to your needs
            write text "cd ~/npr/projects/debates/"
            write text "workon debates"
            write text "git pull"
        end tell
        tell server
            -- server pane
            set name to "server"
            set daemon to (split horizontally with default profile)
            -- CHANGE path to your needs
            write text "cd ~/npr/projects/debates/"
            write text "workon debates"
            write text "fab app"
        end tell
        tell daemon
            -- daemon pane
            set name to "daemon"
            -- CHANGE path to your needs
            write text "cd ~/npr/projects/debates/"
            write text "workon debates"
            write text "fab daemons.main"
        end tell
    end tell
end tell
