from django.db import models

# Create your models here.
class MedicineCategory(models.Model):
    class Meta:
        verbose_name_plural = "Medicine Categories"

    name = models.CharField(max_length=2000)
    short_code = models.CharField(max_length=20)

    def __str__(self):
        return self.name

class Medicine(models.Model):
    uqid = models.IntegerField(unique=True)
    name = models.CharField(max_length=2000)
    formulation = models.CharField(max_length=4000)
    category = models.ForeignKey(MedicineCategory, on_delete=models.CASCADE)
    stock = models.IntegerField()
    expiry_date = models.DateField(null=True, blank=True)

    def __str__(self):
        return f"{self.uqid} - {self.name} ({self.category}) - Available {self.stock}"

class MedicalCampVenue(models.Model):
    name = models.CharField(max_length=2000)

    def __str__(self):
        return self.name

class MedicalCamp(models.Model):
    number = models.IntegerField()
    venue = models.ForeignKey(MedicalCampVenue, on_delete=models.CASCADE)
    date = models.DateField()

    def __str__(self):
        return f"{self.venue} -{self.number} on {self.date}"

class Issue(models.Model):
    patient_id = models.IntegerField()
    camp = models.ForeignKey(MedicalCamp, on_delete=models.CASCADE)
    medicine = models.ForeignKey(Medicine, on_delete=models.CASCADE)
    qty = models.IntegerField()

    def __str__(self):
        return f"Issued {self.qty} of {self.medicine.name} to {self.patient_id} at {self.camp}"


class Vitals(models.Model):
    class Meta:
        verbose_name_plural = "Vitals"

    patient_id = models.IntegerField()
    camp = models.ForeignKey(MedicalCamp, on_delete=models.CASCADE)
    blood_pressure = models.CharField(max_length = 100)
    glucose = models.CharField(max_length = 100)
    haemoglobin = models.CharField(max_length = 100)

    def __str__(self):
        return f"Patient : {self.patient_id}, Camp : {self.camp}, Blood Pressure : {self.blood_pressure}, Sugar : {self.glucose}, Haemoglobin : {self.haemoglobin}"

class MedicalTest(models.Model):
    name = models.CharField(max_length=1000)
    
    def __str__(self):
        return self.name
        
class TestIssue(models.Model):
    patient_id = models.IntegerField()
    camp = models.ForeignKey(MedicalCamp, on_delete=models.CASCADE)
    test = models.ForeignKey(MedicalTest, on_delete=models.CASCADE)
    
    def __str__(self):
        return f"Patient {self.patient_id}, Camp: {self.camp} issued {self.test}"

class Patient(models.Model):
    class Meta:
        db_table = 'patient_details'

    patient_id = models.IntegerField(unique=True)
    patient_name = models.CharField(max_length=2000, null=True, blank=True)
    patient_gender = models.CharField(max_length=10, null=True, blank=True)
    patient_addr = models.CharField(max_length=4000, null=True, blank=True)
    patient_age = models.IntegerField(null=True, blank=True)
    contact_no = models.CharField(max_length=20, null=True, blank=True)
    registered_date = models.DateField(null=True, blank=True)
    camp_session = models.IntegerField(null=True, blank=True)

    def __str__(self):
        return f"{self.patient_id} - {self.patient_name or 'No Name'}"

class CampWiseStock(models.Model):

    camp = models.ForeignKey(
        MedicalCamp,
        on_delete=models.CASCADE,
        related_name='camp_stocks'
    )

    medicine = models.ForeignKey(
        Medicine,
        on_delete=models.CASCADE,
        related_name='camp_stocks'
    )

    allocated_stock = models.IntegerField(default=0)

    used_stock = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('camp', 'medicine')

    def remaining_stock(self):
        return self.allocated_stock - self.used_stock

    def __str__(self):
        return (
            f"{self.camp} - "
            f"{self.medicine.name} - "
            f"Allocated: {self.allocated_stock}, "
            f"Used: {self.used_stock}"
        )
