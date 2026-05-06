import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'medicalcamp_inventory.settings')
django.setup()

import pandas as pd
import tqdm
from inventory.models import Medicine, MedicineCategory, Vitals, MedicalCamp

vitals_list = pd.read_csv('all_haemoglobin.csv').fillna('NA').to_dict('records')

#print(vitals_list)

import re



for record in tqdm.tqdm(vitals_list):
    patient_id = int(record['ID No'])

    for key, value in record.items():
        if key != 'ID No':
            if value in ['-', '--']:
                value = "NA"
            
            v = Vitals.objects.filter(patient_id = patient_id, camp__number = int(key))
            if v:
                v = v[0]
            else:
                v = Vitals()
                v.patient_id = patient_id
                v.camp = MedicalCamp.objects.get(number=int(key))
       
            #v.blood_pressure = value
            #v.glucose = value
            v.haemoglobin = value
            v.save()
   # break


# for med_record in tqdm.tqdm(med_list):
#     medicine = Medicine()
#     medicine.uqid = int(med_record['UQID'])
#     medicine.name = med_record['Name']
#     medicine.category = MedicineCategory.objects.get(short_code=med_record['Category'])
#     medicine.formulation = med_record['Formulation']
#     medicine.stock = 0
#     medicine.save()
