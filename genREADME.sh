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
            if [ $CODE -eq 200 ];then 
                MDEXTID=$(echo -n "$EXTID" | sed 's/-/\&nbsp;/g')
                echo "| [$MDEXTID](https://github.com/igorlogius/webextensions/tree/main/sources/$EXTID) | $DESC | [link](https://addons.mozilla.org/firefox/addon/$EXTID) |"
            #else
            #    echo "| [$TMPEXTID](https://github.com/igorlogius/webextensions/tree/main/sources/$EXTID) | $DESC |  |"
            fi
        fi
    done | sort -t'|' -k1,1
fi
echo ""

