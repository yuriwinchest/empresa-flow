$key = "$HOME\.ssh\empresa-flow-key"
$target = "root@72.61.133.214"
$configFile = "ataticagestao_vps.conf"

Write-Host "--- UPLOADING NGINX CONFIG ---"
# Upload to conf.d based on ls output from VPS
scp -i $key -o StrictHostKeyChecking=no $configFile "${target}:/etc/nginx/conf.d/ataticagestao.conf"

Write-Host "--- RELOADING NGINX ---"
$cmd = "nginx -t && systemctl reload nginx"
ssh -n -i $key -o StrictHostKeyChecking=no $target $cmd

Write-Host "✅ Nginx Configuration Updated!"
