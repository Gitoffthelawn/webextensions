rm -f .github/workflows/*.yml
for x in *;do 
    if [ -d $x ];then
        sed "s/PLACEHOLDER/$x/g" workflow-template.yml > .github/workflows/$x.yml
    fi
done
