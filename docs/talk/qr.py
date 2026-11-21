import qrcode, sys
ev = sys.argv[1] if len(sys.argv) > 1 else "talk-general"
print("REMINDER: pass a per-event tag like talk-<event> (e.g. talk-austin-1120); default is talk-general.")
codes = {
 "qr_assess.png": f"https://my4mlife.com/assessment?src={ev}",
 "qr_ud.png": f"https://my4mlife.com/go/uninsured-decade?src={ev}",
 "qr_bwtem.png": "https://www.amazon.com/dp/B0HCXZQBKY",
 "qr_ud_amz.png": "https://www.amazon.com/dp/B0HRTNDNRQ",
 "qr_cys.png": "https://www.amazon.com/dp/B0HRS79T35",
}
for f, u in codes.items():
    q = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=20, border=2)
    q.add_data(u); q.make(fit=True)
    q.make_image(fill_color="#0A1430", back_color="white").save(f)
    print(f, u)
