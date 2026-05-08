from django.shortcuts import render, redirect
from django.core import serializers
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth import authenticate, login
import json
import csv

from .forms import IssueForm, VitalsForm
from .models import Medicine, MedicalCamp, MedicalCampVenue, PatientMedicineIssue, MedicineCategory, Vitals, PatientVitals, MedicalTest, TestIssue, Patient, CampWiseStock

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
            all_vitals['haemoglobin'][d_str] = vital.haemoglobin

    return all_vitals    

def get_patient_profile(request):
    groups={}
    p_vitals = []
    all_vitals = {}
    patient_id=None
    if 'patient_id' in request.GET:
        patient_id = request.GET['patient_id']
        selected_issues = PatientMedicineIssue.objects.filter(patient_id=patient_id).order_by('-camp')
        p_vitals = Vitals.objects.filter(patient_id=patient_id).order_by('camp')
        all_vitals = charts_data(p_vitals)

        groups = {}
        for issue in selected_issues:
            if issue.camp not in groups:
                groups[issue.camp] = []
            groups[issue.camp].append(issue)

    return render(request, 'inventory/patient.tpl.html', {'groups' : groups, 'patient_id' : patient_id, 'patient_vitals' : p_vitals, 'vital_charts' : all_vitals})

def get_patient_vitals(request):
    success = False
    if request.method == 'GET':
        vitals_form = VitalsForm()
    elif request.method == 'POST':
        vitals_form = VitalsForm()
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
        test_ids = request.POST.getlist("tests")
        camp_id = int(request.POST['camp'])
        patient_id = int(request.POST['patient_id'])
        
        camp = MedicalCamp.objects.get(id=camp_id)
        for test_id in test_ids:
            test = MedicalTest.objects.get(id = test_id)
            test_issue = TestIssue()
            test_issue.camp = camp
            test_issue.patient_id = patient_id
            test_issue.test = test
            test_issue.save()
            
        return render(request, 'inventory/tests.tpl.html', {'all_tests' : all_test_types, 'all_camps': all_camps, 'success': True})

def get_issued_tests(request, patient_id, camp_id):
    v = TestIssue.objects.filter(patient_id = patient_id, camp__id = camp_id)
    if v:
        tests = [x.test.id for x in v]
        return JsonResponse(json.dumps(tests), safe=False)
    return JsonResponse('{}', safe=False)

def search_vitals(request, patient_id, camp_id):
    v = Vitals.objects.filter(patient_id = patient_id, camp__id = camp_id)
    if v:
        v = v[0]
        return JsonResponse(serializers.serialize('json', [ v, ]), safe=False)
    return JsonResponse('{}', safe=False)

def index(request):
    success = False
    if request.method == 'GET':
        issue_form = IssueForm()
    elif request.method == 'POST':
        issue_form = IssueForm()
        patient_id = request.POST['patient_id']
        medical_camp = MedicalCamp.objects.get(id=int(request.POST['medical_camp']))
        med_ids = request.POST.getlist('med-id')
        qtys = request.POST.getlist('qty')
        for m in range(len(med_ids)):
            if len(med_ids[m]) > 0:
                issue = PatientMedicineIssue()
                issue.patient_id = int(patient_id)
                issue.camp = medical_camp
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

def api_get_camps(request):
    camps = MedicalCamp.objects.all().order_by('id')
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
    issues = PatientMedicineIssue.objects.filter(patient_id=patient_id).order_by('-camp__date')
    history = {}
    for issue in issues:
        camp_key = f"{issue.camp.venue.name} - {issue.camp.number} ({issue.camp.date})"
        if camp_key not in history:
            history[camp_key] = []
        history[camp_key].append({
            'medicine': issue.medicine.name,
            'qty': issue.qty
        })

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
        med_issues = data.get('issues', [])

        camp = MedicalCamp.objects.get(id=camp_id)
        
        for item in med_issues:
            med_id = item.get('med_id')
            qty = int(item.get('qty', 0))
            if med_id and qty > 0:
                medicine = Medicine.objects.get(uqid=med_id)
                
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
                
                PatientMedicineIssue.objects.create(
                    patient_id=patient_id,
                    camp=camp,
                    medicine=medicine,
                    qty=qty
                )
        
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
        med_issues = data.get('medicines', [])
        camp = MedicalCamp.objects.get(id=camp_id)
        
        v = PatientVitals.objects.create(
            patient_id=patient_id,
            camp_id=camp_id,
            date=data.get('date'),
            time=data.get('time'),
            e_no=data.get('e_no'),
            weight=data.get('weight'),
            height=data.get('height'),
            blood_pressure=data.get('blood_pressure'),
            pulse=data.get('pulse'),
            glucose=data.get('glucose'),
            rbs=data.get('rbs'),
            haemoglobin=data.get('haemoglobin'),
            last_food_time=data.get('last_food_time'),
            dr_name=data.get('dr_name'),
            dr_id=data.get('dr_id'),
            diagnosis=data.get('diagnosis')
        )

        for item in med_issues:
            med_id = item.get('msNo')
            qty = int(item.get('quantity', 0))
            
            if med_id and qty > 0:
                medicine = Medicine.objects.filter(uqid=med_id).first()
                if medicine:
                    try:
                        camp_stock = CampWiseStock.objects.get(camp=camp, medicine=medicine)
                        if camp_stock.remaining_stock() < qty:
                            v.delete() 
                            return JsonResponse({
                                'status': 'error', 
                                'message': f'Insufficient stock in this camp for {medicine.name}. Available: {camp_stock.remaining_stock()}'
                            }, status=400)
                    except CampWiseStock.DoesNotExist:
                        v.delete()
                        return JsonResponse({
                            'status': 'error', 
                            'message': f'Stock not allocated to this camp for {medicine.name}'
                        }, status=400)

                    PatientMedicineIssue.objects.create(
                        patient_id=patient_id,
                        camp=camp,
                        medicine=medicine,
                        qty=qty,
                        vitals_record=v,
                        strength=item.get('strength'),
                        days=int(item.get('days') or 0),
                        morning=int(item.get('morning') or 0),
                        afternoon=int(item.get('afternoon') or 0),
                        night=int(item.get('night') or 0)
                    )

        # Save selected lab tests
        selected_tests = data.get('selected_tests', [])
        for test_id in selected_tests:
            test = MedicalTest.objects.filter(test_id=test_id).first()
            if test:
                TestIssue.objects.create(
                    patient_id=patient_id,
                    camp=camp,
                    test=test
                )
        
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

@csrf_exempt
@require_http_methods(["POST"])
def api_set_medicine_stock(request):
    try:
        data = json.loads(request.body)
        uqid = data.get('uqid')
        new_stock = int(data.get('stock', 0))

        if new_stock < 0:
            return JsonResponse({'status': 'error', 'message': 'Stock cannot be negative.'}, status=400)

        medicine = Medicine.objects.get(uqid=uqid)
        medicine.stock = new_stock
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
            return JsonResponse({'status': 'error', 'message': 'Insufficient stock'}, status=400)
        camp_stock = CampWiseStock.objects.get(camp_id=camp_id, medicine=medicine)
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
        return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

@csrf_exempt
@require_http_methods(["POST"])
def api_set_camp_allocation(request):
    try:
        data = json.loads(request.body)
        camp_id = data.get('camp_id')
        uqid = data.get('uqid')
        qty = int(data.get('qty', 0))
        if qty < 0:
            return JsonResponse({'status': 'error', 'message': 'Quantity cannot be negative.'}, status=400)
        camp = MedicalCamp.objects.get(id=camp_id)
        medicine = Medicine.objects.get(uqid=uqid)
        camp_stock, _ = CampWiseStock.objects.get_or_create(
            camp=camp,
            medicine=medicine,
            defaults={'allocated_stock': 0, 'used_stock': 0}
        )
        diff = qty - camp_stock.allocated_stock
        if diff > 0 and medicine.stock < diff:
            return JsonResponse({'status': 'error', 'message': f'Insufficient central stock. Available: {medicine.stock}'}, status=400)
        medicine.stock -= diff
        medicine.save()
        camp_stock.allocated_stock = qty
        camp_stock.save()
        return JsonResponse({'status': 'success', 'new_allocation': qty, 'central_stock': medicine.stock})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

@csrf_exempt
@require_http_methods(["POST"])
def api_return_to_warehouse(request):
    try:
        data = json.loads(request.body)
        camp_id = data.get('camp_id')
        med_id = data.get('med_id')
        camp_stock = CampWiseStock.objects.get(camp_id=camp_id, medicine__uqid=med_id)
        remaining = camp_stock.remaining_stock()
        if remaining > 0:
            medicine = camp_stock.medicine
            medicine.stock += remaining
            medicine.save()
        camp_stock.allocated_stock = 0
        camp_stock.used_stock = 0
        camp_stock.save()
        return JsonResponse({'status': 'success', 'new_total': medicine.stock})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

@csrf_exempt
@require_http_methods(["POST"])
def api_close_camp_session(request):
    try:
        data = json.loads(request.body)
        camp_id = data.get('camp_id')
        camp_stocks = CampWiseStock.objects.filter(camp_id=camp_id)
        for cs in camp_stocks:
            remaining = cs.remaining_stock()
            if remaining > 0:
                medicine = cs.medicine
                medicine.stock += remaining
                medicine.save()
            cs.allocated_stock = 0
            cs.used_stock = 0
            cs.save()
        return JsonResponse({'status': 'success', 'message': 'Camp session closed and stock returned to warehouse'})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

@csrf_exempt
@require_http_methods(["POST"])
def api_register_camp(request):
    try:
        data = json.loads(request.body)
        camp_number = data.get('camp_number')
        venue_name = data.get('venue_name')
        camp_date = data.get('date')
        venue, _ = MedicalCampVenue.objects.get_or_create(name=venue_name)
        camp = MedicalCamp.objects.create(
            number=camp_number,
            venue=venue,
            date=camp_date
        )
        return JsonResponse({
            'status': 'success', 
            'message': f'Camp {camp_number} at {venue_name} registered successfully',
            'camp_id': camp.id
        })
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

def api_get_medical_tests(request):
    tests = MedicalTest.objects.all().order_by('test_id')
    data = []
    for t in tests:
        data.append({
            'id': t.test_id,
            'name': t.name,
            'actual_cost': float(t.actual_cost),
            'patient_cost': float(t.patient_cost),
        })
    return JsonResponse(data, safe=False)