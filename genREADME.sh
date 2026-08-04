#!/usr/bin/env bash

cat<<  EOF
This repository contains the sources of the following [webextensions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)

Feel free to take or use them however you like.
EOF

echo ""
echo "| Src | Description | AMO |"
echo "| ---:  | --- | --- |"

if [ -d ./sources ];then 
    for x in ./sources/*;do 
        if [ -f "$x/manifest.json" ]; then

            EXTID=$(basename "$x") 
            DESC=$(jq -r '.description // ""' "$x/manifest.json" 2>/dev/null)
            AMOLURL="https://addons.mozilla.org/firefox/addon/$EXTID"

            CODE=$(curl -sL -I "$AMOLURL" -w "%{http_code}" -o /dev/null)
            # DAILY USERS + other details 
            # curl -H "Accept: application/json" -sL https://addons.mozilla.org//api/v5/addons/addon/copy-tabs  | jq '.average_daily_users' 
            if [ $CODE -eq 200 ];then 
                AMO_AUTHOR=$(curl -sL --url "https://addons.mozilla.org//api/v4/addons/addon/$EXTID" | jq -r '.authors[0]|.name')
                #echo "AMO_AUTHOR: $AMO_AUTHOR"
                if [ "$AMO_AUTHOR" = "igorlogius" ];then
                    MDEXTID=$(echo -n "$EXTID" | sed 's/-/\&nbsp;/g')
                    echo "| [$MDEXTID](https://github.com/igorlogius/webextensions/tree/main/sources/$EXTID) | $DESC | [link](https://addons.mozilla.org/firefox/addon/$EXTID) |"
                fi
            #else
            #    echo "| [$TMPEXTID](https://github.com/igorlogius/webextensions/tree/main/sources/$EXTID) | $DESC |  |"
            fi
        fi
    done | sort -t'|' -k1,1
fi
echo ""

