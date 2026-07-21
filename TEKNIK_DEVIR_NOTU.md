# ALKÜ Depo Yönetim Sistemi V6 — Teknik Devir

## İş mantığı
- Sistem çoklu depo yapısındadır.
- `warehouses` depo kartlarını ve dolap/raf listesini içerir.
- Her envanter kaydında `warehouse` ve `cabinet` alanı bulunur.
- Ses deposu `SES`, mevcut D1-D4 verileriyle korunmuştur.
- Diğer depolar boş olarak oluşturulmuştur; kullanıcılar arayüzden malzeme girebilir.
- Yetkilendirme istenmemiştir.

## Mevcut prototip sınırlaması
Veriler `localStorage` içindedir. Farklı bilgisayarlar aynı veriyi görmez. Kurum sunucusunda ortak kullanım için API ve veritabanı zorunludur.

## Önerilen tablolar
- warehouses
- storage_locations
- items
- stock_movements
- loans
- audit_logs

## Önerilen raporlar
- Tüm depolar envanteri
- Depo bazlı envanter
- Eksik/fazla stok
- Açık teslimler
- Tarih aralıklı hareket
- Depo özeti
- Satın alma ihtiyaç listesi

## Geçiş önerisi
Frontend korunabilir. `localStorage` çağrıları REST API çağrılarına çevrilmelidir.
