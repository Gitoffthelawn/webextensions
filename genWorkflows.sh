rm -f .github/workflows/*.yml
for x in *;do 
    if [ -d $x ];then
        CODE=$(curl -sL -I "https://addons.mozilla.org/en-US/firefox/addon/$x" -w "%{http_code}" -o /dev/null)
        if [ $CODE -eq 200 ];then 
            sed "s/PLACEHOLDER/$x/g" workflow-template.yml > .github/workflows/$x.yml
        fi
    fi
done
