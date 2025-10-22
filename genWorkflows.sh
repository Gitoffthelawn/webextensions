#!/usr/bin/env bash

if [ -f ./workflow-template.yml ];then 

    if [ -d ./sources ];then 

        if [ -d ./.github/workflows ]; then 

            rm -f ./.github/workflows/*.yml

            for x in ./sources/*;do 

                if [ -d $x ]; then

                    EXTID=$(basename "$x") 

                    CODE=$(curl -sL -I "https://addons.mozilla.org/en-US/firefox/addon/$EXTID" -w "%{http_code}" -o /dev/null)
                    if [ $CODE -eq 200 ];then 
                        sed "s/PLACEHOLDER/$EXTID/g" ./workflow-template.yml > ./.github/workflows/$EXTID.yml
                        echo .github/workflows/$EXTID.yml
                    fi
                fi

            done
        fi

    fi
fi
