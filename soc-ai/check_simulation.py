import urllib.request

urls = [
    'http://127.0.0.1:8001/api/v1/alerts/incidents',
    'http://127.0.0.1:8001/api/v1/alerts/raw',
]

for url in urls:
    print('URL:', url)
    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            data = resp.read().decode('utf-8')
            print(data[:2000])
    except Exception as e:
        print('ERROR:', e)
    print('-' * 80)
