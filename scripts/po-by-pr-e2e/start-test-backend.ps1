Set-Location 'C:\Users\gaura\Downloads\silver-muller-seals\backend'
$env:SPRING_DATASOURCE_URL = 'jdbc:postgresql://localhost:5434/sms_seals_test'
$env:SPRING_DATASOURCE_USERNAME = 'postgres'
$env:SPRING_DATASOURCE_PASSWORD = 'postgres'
$env:PORT = '4100'
mvn -B spring-boot:run *> "$env:TEMP\test-backend.log"
