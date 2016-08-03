
#!/bin/bash
# Backup key data to nas

export RSYNC_PASSWORD=rsync

# backup and update config file on success
rsync -av --copy-links --timeout=300 --exclude '.DS_Store' /Users/zischkej/node/tracker-keeper/app/ rsync@192.168.1.6::Web

###rsync -av --timeout=300 --exclude '.DS_Store' --delete --link-dest=/node/$PREV /Users/zischkej/node rsync@192.168.1.6::Backup/node/$CUR && printf "PREV=%s\n" "$CUR" > $CONF

