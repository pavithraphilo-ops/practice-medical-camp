from django.shortcuts import render, redirect
from .forms import IssueForm, VitalsForm
from .models import Medicine, MedicalCamp, Issue, MedicineCategory, Vitals, MedicalTest, TestIssue, Patient, CampWiseStock
from django.core import serializers
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
import csv


def charts_data(vitals):
    all_vitals = {"blood_pressure" : {}, "glucose" : {}, "haemoglobin": {}}
    for vital in vitals:
        d_str = vital.camp.date.strftime('%Y-%m-%d')
        if vital.blood_pressure.strip() not in ["NA", '-']:
            bp = vital.blood_pressure.split('/')
            if len(bp) >= 2:
                all_vitals['blood_pressure'][d_str] = {"systolic" : bp[0], "diastolic" : bp[1]}
        
        if vital.glucose.strip() not in ["NA", '-']:
            all_vitals['glucose'][d_str] = vital.glucose

        if vital.haemoglobin.strip() not in ["NA", '-']:
            print(vital.haemoglobin)
            all_vitals['haemoglobin'][d_str] = vital.haemoglobin

    return all_vitals    

def get_patient_profile(request):
    groups={}
    p_vitals = []
    all_vitals = {}
    patient_id=None
    if 'patient_id' in request.GET:
        patient_id = request.GET['patient_id']
        selected_issues = Issue.objects.filter(patient_id=patient_id).order_by('-camp')
        p_vitals = Vitals.objects.filter(patient_id=patient_id).order_by('camp')
        all_vitals = charts_data(p_vitals)
        #print(all_vitals)

        groups = {}
        for issue in selected_issues:
       
            if issue.camp not in groups:
                groups[issue.camp] = []
            groups[issue.camp].append(issue)

    #print(groups)
#    return HttpResponse(serializers.serialize('json', groups))
#    return JsonResponse(groups)
    return render(request, 'inventory/patient.tpl.html', {'groups' : groups, 'patient_id' : patient_id, 'patient_vitals' : p_vitals, 'vital_charts' : all_vitals})



def get_patient_vitals(request):
    success = False
    if request.method == 'GET':
        vitals_form = VitalsForm()
    elif request.method == 'POST':
        vitals_form = VitalsForm()
        print(request.POST)
        v = Vitals.objects.filter(patient_id = request.POST['patient_id'], camp__id = int(request.POST['medical_camp']))
        if v:
            v = v[0]
        else:
            v = Vitals()
            v.patient_id = request.POST['patient_id']
            v.camp = MedicalCamp.objects.get(id=int(request.POST['medical_camp']))

        v.blood_pressure = request.POST["blood_pressure"]
        v.glucose = request.POST["glucose"]
        v.haemoglobin = request.POST["haemoglobin"]
        v.save()
        
        success = True
  
    vitals_form = VitalsForm()
    return render(request, 'inventory/vitals.tpl.html', {'vitals_form' : vitals_form, 'success' : success})


def issue_tests(request):
    all_camps = MedicalCamp.objects.all().order_by("-date")
    all_test_types = MedicalTest.objects.all()
    
    if request.method == 'GET':
        return render(request, 'inventory/tests.tpl.html', {'all_tests' : all_test_types, 'all_camps': all_camps})
        
    elif request.method == 'POST':
        #print(request.POST)
        test_ids = request.POST.getlist("tests")
        camp_id = int(request.POST['camp'])
        patient_id = int(request.POST['patient_id'])
        
        camp = MedicalCamp.objects.get(id=camp_id)
        print(request.POST)
        print(camp_id, camp)
        for test_id in test_ids:
            test = MedicalTest.objects.get(id = test_id)
            test_issue = TestIssue()
            test_issue.camp = camp
            test_issue.patient_id = patient_id
            test_issue.test = test
            test_issue.save()
            
        return render(request, 'inventory/tests.tpl.html', {'all_tests' : all_test_types, 'all_camps': all_camps, 'success': True})
        
import json

def get_issued_tests(request, patient_id, camp_id):
    v = TestIssue.objects.filter(patient_id = patient_id, camp__id = camp_id)
    if v:
        tests = [x.test.id for x in v]
        #json_q = {"patient_id":v.patient_id, "name":med.name, "stock":med.stock}
        #return JsonResponse(serializers.serialize('json', tests), safe=False)
        return JsonResponse(json.dumps(tests), safe=False)
    return JsonResponse('{}', safe=False)



def search_vitals(request, patient_id, camp_id):
    v = Vitals.objects.filter(patient_id = patient_id, camp__id = camp_id)
    if v:
        v = v[0]
        #json_q = {"patient_id":v.patient_id, "name":med.name, "stock":med.stock}
        return JsonResponse(serializers.serialize('json', [ v, ]), safe=False)
    return JsonResponse('{}', safe=False)


#def add_vitals_record(request):



def index(request):
    success = False
    if request.method == 'GET':
        issue_form = IssueForm()
    elif request.method == 'POST':
        issue_form = IssueForm()
        print(request.POST)
        patient_id = request.POST['patient_id']
        medical_camp = MedicalCamp.objects.get(id=int(request.POST['medical_camp']))
        med_ids = request.POST.getlist('med-id')
        qtys = request.POST.getlist('qty')
        print(patient_id, med_ids)
        for m in range(len(med_ids)):
            if len(med_ids[m]) > 0:
                issue = Issue()
                issue.patient_id = int(patient_id)
                issue.camp = medical_camp
                print(m, med_ids[m])
                issue.medicine = Medicine.objects.get(uqid = int(med_ids[m]))
                issue.qty = int(qtys[m])
                issue.save()
                issue.medicine.stock = issue.medicine.stock - issue.qty
                issue.medicine.save()

        success = True
    return render(request, 'inventory/issue.tpl.html', {'issue_form':issue_form, 'success' : success})

def search_meds(request, med_id):
    med = Medicine.objects.filter(uqid=med_id)
    if med:
        med = med[0]
        json_q = {"uqid":med.uqid, "name":med.name, "stock":med.stock}
        return JsonResponse(json_q)
    return JsonResponse({})

def list_meds(request):
    categories = MedicineCategory.objects.all()
    cat_set = {x : Medicine.objects.filter(category=x) for x in categories}
    return render(request, 'inventory/list.tpl.html', {'category_set' : cat_set.items()})

def export(request):
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="stock_list.csv"'

    meds = Medicine.objects.order_by('uqid')
    writer = csv.writer(response)
    writer.writerow(['UQID', 'Name', 'Formulation', 'Stock', 'Expiry Date'])
    for med in meds:
        writer.writerow([med.uqid, med.name, med.formulation, med.stock, med.expiry_date])
    return  response


# --- API Endpoints for React Frontend ---

def api_get_camps(request):
    camps = MedicalCamp.objects.all().order_by('-date')
    data = []
    for camp in camps:
        data.append({
            'id': camp.id,
            'number': camp.number,
            'venue': camp.venue.name,
            'date': camp.date.strftime('%Y-%m-%d')
        })
    return JsonResponse(data, safe=False)

def api_get_medicines(request):
    medicines = Medicine.objects.all().order_by('uqid')
    data = []
    for med in medicines:
        data.append({
            'id': med.id,
            'uqid': med.uqid,
            'name': med.name,
            'formulation': med.formulation,
            'category': med.category.name,
            'stock': med.stock
        })
    return JsonResponse(data, safe=False)

def api_get_patient_details(request, patient_id):
    # Medicine Issues grouped by camp
    issues = Issue.objects.filter(patient_id=patient_id).order_by('-camp__date')
    history = {}
    for issue in issues:
        camp_key = f"{issue.camp.venue.name} - {issue.camp.number} ({issue.camp.date})"
        if camp_key not in history:
            history[camp_key] = []
        history[camp_key].append({
            'medicine': issue.medicine.name,
            'qty': issue.qty
        })

    # Vitals
    vitals_qs = Vitals.objects.filter(patient_id=patient_id).order_by('camp__date')
    vitals_list = []
    for v in vitals_qs:
        vitals_list.append({
            'camp': f"{v.camp.venue.name} - {v.camp.number}",
            'date': v.camp.date.strftime('%Y-%m-%d'),
            'blood_pressure': v.blood_pressure,
            'glucose': v.glucose,
            'haemoglobin': v.haemoglobin
        })

    # Charts Data
    charts = charts_data(vitals_qs)

    return JsonResponse({
        'patient_id': patient_id,
        'medicine_history': history,
        'vitals': vitals_list,
        'charts': charts
    })

@csrf_exempt
@require_http_methods(["POST"])
def api_issue_medicine(request):
    try:
        data = json.loads(request.body)
        patient_id = data.get('patient_id')
        camp_id = data.get('medical_camp')
        med_issues = data.get('issues', []) # List of {med_id, qty}

        camp = MedicalCamp.objects.get(id=camp_id)
        
        for item in med_issues:
            med_id = item.get('med_id')
            qty = int(item.get('qty', 0))
            if med_id and qty > 0:
                medicine = Medicine.objects.get(uqid=med_id)
                
                # Check CampWiseStock availability
                try:
                    camp_stock = CampWiseStock.objects.get(camp=camp, medicine=medicine)
                    if camp_stock.remaining_stock() < qty:
                        return JsonResponse({
                            'status': 'error', 
                            'message': f'Insufficient stock in this camp for {medicine.name}. Available: {camp_stock.remaining_stock()}'
                        }, status=400)
                except CampWiseStock.DoesNotExist:
                    return JsonResponse({
                        'status': 'error', 
                        'message': f'Stock not allocated to this camp for {medicine.name}'
                    }, status=400)
                
                Issue.objects.create(
                    patient_id=patient_id,
                    camp=camp,
                    medicine=medicine,
                    qty=qty
                )
                # The CampWiseStock.used_stock is now handled by signals automatically!
        
        return JsonResponse({'status': 'success'})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

@csrf_exempt
@require_http_methods(["POST"])
def api_save_vitals(request):
    try:
        data = json.loads(request.body)
        patient_id = data.get('patient_id')
        camp_id = data.get('medical_camp')
        
        v, created = Vitals.objects.get_or_create(
            patient_id=patient_id, 
            camp_id=camp_id
        )
        v.blood_pressure = data.get('blood_pressure', 'NA')
        v.glucose = data.get('glucose', 'NA')
        v.haemoglobin = data.get('haemoglobin', 'NA')
        v.save()
        
        return JsonResponse({'status': 'success'})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

@csrf_exempt
@require_http_methods(["POST"])
def api_register_patient(request):
    try:
        data = json.loads(request.body)
        patient = Patient.objects.create(
            patient_id=data.get('pid'),
            patient_name=data.get('name'),
            patient_gender=data.get('gender'),
            patient_addr=data.get('address'),
            patient_age=data.get('age'),
            contact_no=data.get('contact'),
            registered_date=data.get('regdate'),
            camp_session=data.get('camp_session')
        )
        return JsonResponse({'status': 'success', 'patient_id': patient.patient_id})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

from django.contrib.auth import authenticate, login

@csrf_exempt
def api_login(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            username = data.get('username')
            password = data.get('password')
            user = authenticate(request, username=username, password=password)
            if user is not None:
                login(request, user)
                return JsonResponse({'status': 'success', 'message': 'Login successful'})
            else:
                return JsonResponse({'status': 'error', 'message': 'Invalid credentials'}, status=401)
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
    return JsonResponse({'status': 'error', 'message': 'Method not allowed'}, status=405)

def api_check_patient_id(request, pid):
    exists = Patient.objects.filter(patient_id=pid).exists()
    return JsonResponse({'exists': exists})

@csrf_exempt
@require_http_methods(["POST"])
def api_update_medicine_stock(request):
    try:
        data = json.loads(request.body)
        uqid = data.get('uqid')
        added_qty = int(data.get('added_qty', 0))
        
        medicine = Medicine.objects.get(uqid=uqid)
        medicine.stock += added_qty
        medicine.save()
        
        return JsonResponse({
            'status': 'success',
            'new_stock': medicine.stock,
            'medicine_name': medicine.name
        })
    except Medicine.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Medicine not found'}, status=404)
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

def api_get_camp_wise_stock(request):

    stocks = CampWiseStock.objects.all()

    data = []

    for s in stocks:
        data.append({
            'uqid': s.medicine.uqid,
            'medication': s.medicine.name,
            'total_stock': s.medicine.stock,
            'camp_stock': s.allocated_stock,
            'camp': str(s.camp),
            'camp_id': s.camp.id,
            'used_stock': s.used_stock,
            'remaining_stock': s.remaining_stock()
        })

    return JsonResponse(data, safe=False)

def api_get_specific_camp_stock(request, camp_id):
    stocks = CampWiseStock.objects.filter(camp_id=camp_id)
    data = {}
    for s in stocks:
        data[s.medicine.uqid] = {
            'allocated': s.allocated_stock,
            'used': s.used_stock,
            'remaining': s.remaining_stock()
        }
    return JsonResponse(data)

@csrf_exempt
@require_http_methods(["POST"])
def api_allocate_to_camp(request):

    try:

        data = json.loads(request.body)

        camp_id = data.get('camp_id')

        uqid = data.get('uqid')

        qty = int(data.get('qty', 0))

        medicine = Medicine.objects.get(uqid=uqid)

        if medicine.stock < qty:

            return JsonResponse({
                'status': 'error',
                'message': 'Insufficient stock'
            }, status=400)

        camp_stock = CampWiseStock.objects.get(
            camp_id=camp_id,
            medicine=medicine
        )

        medicine.stock -= qty
        medicine.save()

        camp_stock.allocated_stock += qty
        camp_stock.save()

        return JsonResponse({
            'status': 'success',
            'medicine_name': medicine.name,
            'new_total_stock': medicine.stock,
            'new_camp_stock': camp_stock.allocated_stock
        })

    except Exception as e:

        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=400)