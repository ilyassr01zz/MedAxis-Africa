import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useAuth } from '../../hooks/use-auth'
import { getMyPrescriptionsAPI, createPrescriptionAPI } from '../../api/prescriptions'
import { searchPatientAPI } from '../../api/patients'
import { hashCNIE } from '../../utils/hash.utils'

// ─── Design tokens ───────────────────────────────────────────────────────────
const TEAL      = '#0D7C7C'
const TEAL_DARK = '#0A6363'
const TEAL_BG   = '#E6F3F3'
const BORDER    = '#E5E7EB'
const TEXT      = '#1A1A2E'
const MUTED     = '#6B7280'
const BG_PAGE   = '#F5F7F5'
const WHITE     = '#FFFFFF'

// ─── Mock data ───────────────────────────────────────────────────────────────
const PRESCRIPTIONS = [
  { rxId: 'RJ-882190', patient: 'Karima Alaoui',  med: 'Amoxicillin', dose: '500mg • TID',  date: '24/09/2024', expiry: '01/10/2024', status: 'ACTIVE'  },
  { rxId: 'BJ-90201',  patient: 'Fatima Zahrae',  med: 'Metformin',   dose: '1000mg • BID', date: '23/09/2024', expiry: '22/10/2024', status: 'ACTIVE'  },
  { rxId: 'LM-448100', patient: 'Hassan Benali',  med: 'Lisinopril',  dose: '10mg • 1×D',  date: '15/09/2024', expiry: '13/12/2024', status: 'PENDING' },
  { rxId: 'AA-10233',  patient: 'Rachid Tazi',    med: 'Diazepam',    dose: '5mg • PRN',   date: '14/09/2024', expiry: '19/09/2024', status: 'EXPIRED' },
  { rxId: 'XF-778BT',  patient: 'Nadia Chaoui',   med: 'Ibuprofen',   dose: '400mg • BID', date: '08/09/2024', expiry: '13/09/2024', status: 'ACTIVE'  },
]
const TOTAL_RECORDS = 142

const STATUS_CFG = {
  ACTIVE:  { color: TEAL,      label: 'ACTIVE',  action: 'REPRINT', hoverBg: TEAL_DARK },
  PENDING: { color: '#F0A500', label: 'PENDING', action: 'EDIT',    hoverBg: '#D4900A' },
  EXPIRED: { color: '#E53E3E', label: 'EXPIRED', action: 'CLOSE',   hoverBg: '#C03030' },
}

const MOCK_PATIENT = { token: 'PAT-**-8821', firstName: 'Ahmed', activePrescriptions: 2, lastDate: '24/09/2024' }

// ─── Medications registry ─────────────────────────────────────────────────────
const MEDICATIONS = [
  { id: 1,  name: 'Doliprane',        drug_code: 'N02BE01',    category: 'analgesic',         forms: [{ form: 'tablet',  unit: 'pills',   max_dose: 1000, max_units: 3, default_dose: 1 }, { form: 'syrup',   unit: 'ml',      max_dose: 200,  max_units: 1, default_dose: 100 }, { form: 'sachet',  unit: 'sachets', max_dose: 1000, max_units: 3, default_dose: 1    }] },
  { id: 2,  name: 'Amoxicilline',     drug_code: 'J01CA04',    category: 'antibiotic',         forms: [{ form: 'capsule', unit: 'pills',   max_dose: 1000, max_units: 3, default_dose: 1 }, { form: 'syrup',   unit: 'ml',      max_dose: 250,  max_units: 1, default_dose: 125  }] },
  { id: 3,  name: 'Ventoline',        drug_code: 'R03AC02',    category: 'bronchodilator',     forms: [{ form: 'inhaler', unit: 'puffs',   max_dose: 2,    max_units: 4, default_dose: 2 }] },
  { id: 4,  name: 'Metformine',       drug_code: 'A10BA02',    category: 'antidiabetic',       forms: [{ form: 'tablet',  unit: 'pills',   max_dose: 1000, max_units: 3, default_dose: 1 }] },
  { id: 5,  name: 'Paracétamol IV',   drug_code: 'N02BE01-IV', category: 'analgesic',          forms: [{ form: 'IV',      unit: 'mg',      max_dose: 1000, max_units: 4, default_dose: 1000 }] },
  { id: 6,  name: 'Tramadol',         drug_code: 'N02AX02',    category: 'controlled_opioid',  controlled: true, forms: [{ form: 'tablet', unit: 'pills', max_dose: 100, max_units: 4, default_dose: 1 }, { form: 'IV', unit: 'mg', max_dose: 100, max_units: 4, default_dose: 50 }] },
  { id: 7,  name: 'Diazépam',         drug_code: 'N05BA01',    category: 'controlled_psy',     controlled: true, forms: [{ form: 'tablet', unit: 'pills', max_dose: 10,  max_units: 3, default_dose: 1 }] },
  { id: 8,  name: 'Oméprazole',       drug_code: 'A02BC01',    category: 'gastro',             forms: [{ form: 'capsule', unit: 'pills',   max_dose: 40,   max_units: 2, default_dose: 1 }] },
  { id: 9,  name: 'Ibuprofène',       drug_code: 'M01AE01',    category: 'anti-inflammatory',  forms: [{ form: 'tablet',  unit: 'pills',   max_dose: 600,  max_units: 3, default_dose: 1 }, { form: 'syrup', unit: 'ml', max_dose: 200, max_units: 3, default_dose: 100 }] },
  { id: 10, name: 'Amitriptyline',    drug_code: 'N06AA09',    category: 'controlled_psy',     controlled: true, forms: [{ form: 'tablet', unit: 'pills', max_dose: 75,  max_units: 3, default_dose: 1 }] },
  { id: 11, name: 'Augmentin',        drug_code: 'J01CR02',    category: 'antibiotic',         forms: [{ form: 'tablet',  unit: 'pills',   max_dose: 1000, max_units: 3, default_dose: 1 }, { form: 'syrup', unit: 'ml', max_dose: 250, max_units: 3, default_dose: 125 }] },
  { id: 12, name: 'Loratadine',       drug_code: 'R06AX13',    category: 'antihistamine',      forms: [{ form: 'tablet',  unit: 'pills',   max_dose: 10,   max_units: 1, default_dose: 1 }, { form: 'syrup', unit: 'ml', max_dose: 100, max_units: 1, default_dose: 100 }] },
  { id: 13, name: 'Prednisolone',     drug_code: 'H02AB06',    category: 'corticosteroid',     forms: [{ form: 'tablet',  unit: 'pills',   max_dose: 60,   max_units: 3, default_dose: 1 }] },
  { id: 14, name: 'Amlodipine',       drug_code: 'C08CA01',    category: 'antihypertensive',   forms: [{ form: 'tablet',  unit: 'pills',   max_dose: 10,   max_units: 1, default_dose: 1 }] },
  { id: 15, name: 'Atorvastatine',    drug_code: 'C10AA05',    category: 'statin',             forms: [{ form: 'tablet',  unit: 'pills',   max_dose: 80,   max_units: 1, default_dose: 1 }] },
  { id: 16, name: 'Levothyroxine',    drug_code: 'H03AA01',    category: 'thyroid',            forms: [{ form: 'tablet',  unit: 'pills',   max_dose: 200,  max_units: 1, default_dose: 1 }] },
  { id: 17, name: 'Furosémide',       drug_code: 'C03CA01',    category: 'diuretic',           forms: [{ form: 'tablet',  unit: 'pills',   max_dose: 80,   max_units: 2, default_dose: 1 }, { form: 'IV', unit: 'mg', max_dose: 80, max_units: 2, default_dose: 40 }] },
  { id: 18, name: 'Metronidazole',    drug_code: 'J01XD01',    category: 'antibiotic',         forms: [{ form: 'tablet',  unit: 'pills',   max_dose: 500,  max_units: 3, default_dose: 1 }, { form: 'IV', unit: 'mg', max_dose: 500, max_units: 3, default_dose: 500 }] },
  { id: 19, name: 'Fluconazole',      drug_code: 'J02AC01',    category: 'antifungal',         forms: [{ form: 'capsule', unit: 'pills',   max_dose: 400,  max_units: 1, default_dose: 1 }] },
  { id: 20, name: 'Cetirizine',       drug_code: 'R06AE07',    category: 'antihistamine',      forms: [{ form: 'tablet',  unit: 'pills',   max_dose: 10,   max_units: 1, default_dose: 1 }, { form: 'syrup', unit: 'ml', max_dose: 100, max_units: 1, default_dose: 100 }] },
  { id: 21, name: 'Salbutamol',       drug_code: 'R03AC02-S',  category: 'bronchodilator',     forms: [{ form: 'inhaler', unit: 'puffs',   max_dose: 2,    max_units: 4, default_dose: 2 }, { form: 'syrup', unit: 'ml', max_dose: 100, max_units: 3, default_dose: 50 }] },
  { id: 22, name: 'Ciprofloxacine',   drug_code: 'J01MA02',    category: 'antibiotic',         forms: [{ form: 'tablet',  unit: 'pills',   max_dose: 750,  max_units: 2, default_dose: 1 }, { form: 'IV', unit: 'mg', max_dose: 400, max_units: 2, default_dose: 400 }] },
  { id: 23, name: 'Ranitidine',       drug_code: 'A02BA02',    category: 'gastro',             forms: [{ form: 'tablet',  unit: 'pills',   max_dose: 300,  max_units: 2, default_dose: 1 }] },
  { id: 24, name: 'Morphine',         drug_code: 'N02AA01',    category: 'controlled_opioid',  controlled: true, forms: [{ form: 'IV', unit: 'mg', max_dose: 15, max_units: 4, default_dose: 10 }, { form: 'tablet', unit: 'pills', max_dose: 30, max_units: 4, default_dose: 1 }] },
  { id: 25, name: 'Codéine',          drug_code: 'R05DA04',    category: 'controlled_opioid',  controlled: true, forms: [{ form: 'tablet', unit: 'pills', max_dose: 60, max_units: 4, default_dose: 1 }, { form: 'syrup', unit: 'ml', max_dose: 100, max_units: 4, default_dose: 15 }] },
  { id: 26, name: 'Alprazolam',       drug_code: 'N05BA12',    category: 'controlled_psy',     controlled: true, forms: [{ form: 'tablet', unit: 'pills', max_dose: 1,  max_units: 3, default_dose: 1 }] },
  { id: 27, name: 'Insuline Glargine',drug_code: 'A10AE04',    category: 'antidiabetic',       forms: [{ form: 'IV',      unit: 'units',   max_dose: 100,  max_units: 1, default_dose: 20 }] },
  { id: 28, name: 'Warfarine',        drug_code: 'B01AA03',    category: 'anticoagulant',      forms: [{ form: 'tablet',  unit: 'pills',   max_dose: 10,   max_units: 1, default_dose: 1 }] },
  { id: 29, name: 'Azithromycine',    drug_code: 'J01FA10',    category: 'antibiotic',         forms: [{ form: 'tablet',  unit: 'pills',   max_dose: 500,  max_units: 1, default_dose: 1 }, { form: 'sachet', unit: 'sachets', max_dose: 500, max_units: 1, default_dose: 1 }] },
  { id: 30, name: 'Pantoprazole',     drug_code: 'A02BC02',    category: 'gastro',             forms: [{ form: 'tablet',  unit: 'pills',   max_dose: 80,   max_units: 2, default_dose: 1 }, { form: 'IV', unit: 'mg', max_dose: 80, max_units: 2, default_dose: 40 }] },
]

// Returns max allowed dosage amount for a form object
function getMaxForForm(fo) {
  return ['pills', 'puffs', 'sachets'].includes(fo.unit) ? fo.max_units : fo.max_dose
}

// Returns dosage label + unit based on form type
function getDosageMeta(fo) {
  if (!fo) return { label: 'Amount', unit: '' }
  switch (fo.form) {
    case 'tablet':
    case 'capsule':  return { label: 'Number of pills', unit: fo.unit }
    case 'syrup':
    case 'liquid':   return { label: 'Amount (ml)', unit: fo.unit }
    case 'IV':       return { label: `Amount (${fo.unit})`, unit: fo.unit }
    case 'inhaler':  return { label: 'Number of puffs', unit: fo.unit }
    case 'powder':
    case 'sachet':   return { label: 'Number of sachets', unit: fo.unit }
    default:         return { label: 'Amount', unit: fo.unit }
  }
}

function newMedItem() {
  return { _id: Date.now() + Math.random(), selectedMed: null, selectedForm: '', dosageAmount: '', frequency: '', duration: '', dosageError: '' }
}

const ACTIVITY = [
  { dot: TEAL,      action: 'Prescription #RJ-882190 dispensed',            sub: 'Karima Alaoui • Pharmacie Atlas, Casablanca',    time: '2 hours ago'       },
  { dot: MUTED,     action: 'New prescription issued',                       sub: 'Fatima Zahrae • Amoxicillin 500mg',               time: '3 hours ago'       },
  { dot: '#F0A500', action: 'Prescription #LM-448100 flagged by pharmacist', sub: 'Hassan Benali • Awaiting review',                 time: '5 hours ago'       },
  { dot: MUTED,     action: 'New prescription issued',                       sub: 'Rachid Tazi • Diazepam 5mg',                     time: 'Yesterday, 14:30'  },
  { dot: TEAL,      action: 'Prescription #XF-778BT dispensed',              sub: 'Nadia Chaoui • Pharmacie Centrale, Rabat',        time: 'Yesterday, 11:15'  },
]

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function getFormattedDate() {
  const d = new Date()
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

const NAV = [
  { key: 'dashboard',     label: 'Dashboard',        icon: 'dashboard'     },
  { key: 'prescriptions', label: 'My Prescriptions', icon: 'description'   },
  { key: 'new-rx',        label: 'New Prescription', icon: 'add_circle'    },
  { key: 'patients',      label: 'Patient Lookup',   icon: 'person_search' },
]

// ─── Main component ──────────────────────────────────────────────────────────
export default function DoctorPortal() {
  const { logout, token, user } = useAuth()

  const [activeView, setActiveView]           = useState('dashboard')
  const [currentPage, setCurrentPage]         = useState(1)
  const [form, setForm]                       = useState({ patientId: '', diagnosis: '', expiryDays: '', notes: '' })
  const [medications, setMedications]         = useState([newMedItem()])
  const [formErrors, setFormErrors]           = useState({})
  const [submitting, setSubmitting]           = useState(false)
  const [successRxId, setSuccessRxId]         = useState(null)
  const [successExpiry, setSuccessExpiry]     = useState(null)
  const [dashSuccess, setDashSuccess]         = useState(false)
  const [patientQuery, setPatientQuery]       = useState('')
  const [patientSearched, setPatientSearched] = useState(false)
  const [patientResult, setPatientResult]     = useState(null)
  const [patientError, setPatientError]       = useState('')
  const [searchLoading, setSearchLoading]     = useState(false)
  const [formError, setFormError]             = useState('')
  const [prescriptions, setPrescriptions]     = useState(PRESCRIPTIONS)
  const [syncMinutes, setSyncMinutes]         = useState(2)

  useEffect(() => {
    const interval = setInterval(() => setSyncMinutes(prev => prev + 1), 60000)
    return () => clearInterval(interval)
  }, [])

  // Load real prescriptions on mount
  useEffect(() => {
    if (!token) return
    const load = async () => {
      try {
        const result = await getMyPrescriptionsAPI(token)
        if (result.success && Array.isArray(result.data)) {
          const mapped = result.data.map(rx => ({
            rxId:    rx.rxId || rx.rx_id,
            patient: rx.patientFirstName || rx.patientToken || 'Patient',
            med:     rx.drugName || rx.drug_name || rx.medication || '',
            dose:    rx.dosage || '',
            date:    rx.issuedAt ? new Date(rx.issuedAt).toLocaleDateString('en-GB') : '',
            expiry:  rx.expiresAt ? new Date(rx.expiresAt).toLocaleDateString('en-GB') : '',
            status:  rx.status || 'ACTIVE',
          }))
          setPrescriptions(mapped.length > 0 ? mapped : PRESCRIPTIONS)
        }
      } catch (err) {
        // Fall back to mock data if backend unavailable
        console.error('Failed to load prescriptions:', err)
      }
    }
    load()
  }, [token])

  const leftRef       = useRef(null)
  const rightInnerRef = useRef(null)
  const patientIdRef  = useRef(null)
  const lookupRef     = useRef(null)

  const totalPages = Math.ceil(TOTAL_RECORDS / 5)
  const pages = useMemo(() => {
    const start = Math.max(1, currentPage - 1)
    const end   = Math.min(totalPages, currentPage + 1)
    const arr = []
    for (let i = start; i <= end; i++) arr.push(i)
    return arr
  }, [currentPage, totalPages])

  const goTo = useCallback((view) => {
    setActiveView(view)
    if (view === 'new-rx') {
      setSuccessRxId(null)
      setTimeout(() => { if (patientIdRef.current) patientIdRef.current.focus() }, 50)
    } else if (view === 'patients') {
      setTimeout(() => { if (lookupRef.current) lookupRef.current.focus() }, 50)
    } else if (view === 'dashboard') {
      setTimeout(() => {
        if (leftRef.current) leftRef.current.scrollTop = 0
        if (rightInnerRef.current) rightInnerRef.current.scrollTop = 0
      }, 0)
    }
  }, [])

  const setField = useCallback((k, v) => {
    setForm(f => ({ ...f, [k]: v }))
    setDashSuccess(false)
  }, [])

  const resetForm = useCallback(() => {
    setForm({ patientId: '', diagnosis: '', expiryDays: '', notes: '' })
    setMedications([newMedItem()])
    setFormErrors({})
    setSuccessRxId(null)
    setSuccessExpiry(null)
    setDashSuccess(false)
  }, [])

  // Shared prescription creation logic
  const submitPrescription = useCallback(async () => {
    // ── Validation ──
    const errors = {}
    if (!form.patientId.trim()) errors.patientId = 'Patient ID is required'

    const validMeds = medications.filter(m => m.selectedMed && m.selectedForm)
    if (validMeds.length === 0) {
      errors.medications = 'At least one medication with a form selected is required'
    } else {
      const codes = validMeds.map(m => m.selectedMed.drug_code)
      if (new Set(codes).size !== codes.length) errors.medications = 'Duplicate medications are not allowed'

      let medIssue = null
      validMeds.forEach(m => {
        if (medIssue) return
        const fo = m.selectedMed.forms.find(f => f.form === m.selectedForm)
        if (!fo) return
        const n = parseFloat(m.dosageAmount)
        const max = getMaxForForm(fo)
        if (!m.dosageAmount || isNaN(n) || n <= 0) medIssue = 'One or more medications have invalid dosage'
        else if (n > max) medIssue = `One or more medications exceed maximum dosage`
        if (!m.frequency || !m.frequency.trim()) medIssue = 'Frequency is required for all medications'
        const dur = parseInt(m.duration, 10)
        if (!m.duration || isNaN(dur) || dur < 1 || dur > 365) medIssue = 'Duration (1–365 days) is required for all medications'
      })
      if (medIssue) errors.medications = errors.medications || medIssue
    }

    if (form.expiryDays) {
      const expNum = parseInt(form.expiryDays, 10)
      if (isNaN(expNum) || expNum < 1 || expNum > 180) errors.expiryDays = 'Expiry must be between 1 and 180 days'
    }
    if (form.notes && form.notes.length > 300) errors.notes = 'Notes must be 300 characters or fewer'

    if (Object.keys(errors).length > 0) { setFormErrors(errors); return null }
    setFormErrors({})
    setSubmitting(true)
    setFormError('')
    try {
      const cnie_hash = await hashCNIE(form.patientId)
      const meds = validMeds.map(m => {
        const fo = m.selectedMed.forms.find(f => f.form === m.selectedForm)
        return {
          drug_code:    m.selectedMed.drug_code,
          drug_name:    m.selectedMed.name,
          form:         m.selectedForm,
          dosage_amount: parseFloat(m.dosageAmount),
          dosage_unit:  fo ? fo.unit : '',
          frequency:    m.frequency,
          duration_days: parseInt(m.duration, 10),
          controlled:   !!m.selectedMed.controlled,
        }
      })
      const result = await createPrescriptionAPI(token, {
        patient_id:       form.patientId,
        patient_cnie_hash: cnie_hash,
        medications:      meds,
        drug_code:        meds[0].drug_code,
        drug_name:        meds[0].drug_name,
        dosage:           `${meds[0].dosage_amount} ${meds[0].dosage_unit}`,
        frequency:        meds[0].frequency,
        duration_days:    meds[0].duration_days,
        expiry_days:      form.expiryDays ? parseInt(form.expiryDays, 10) : null,
        notes:            form.notes || null,
      })
      if (result.success) {
        try {
          const updated = await getMyPrescriptionsAPI(token)
          if (updated.success && Array.isArray(updated.data)) {
            const mapped = updated.data.map(rx => ({
              rxId:    rx.rxId || rx.rx_id,
              patient: rx.patientFirstName || rx.patientToken || 'Patient',
              med:     rx.drugName || rx.drug_name || rx.medication || '',
              dose:    rx.dosage || '',
              date:    rx.issuedAt ? new Date(rx.issuedAt).toLocaleDateString('en-GB') : '',
              expiry:  rx.expiresAt ? new Date(rx.expiresAt).toLocaleDateString('en-GB') : '',
              status:  rx.status || 'ACTIVE',
            }))
            if (mapped.length > 0) setPrescriptions(mapped)
          }
        } catch (_) { /* keep existing list */ }
        return result.data.rxId || result.data.rx_id || ('RJ-' + Math.floor(100000 + Math.random() * 900000))
      }
    } catch (err) {
      setFormError(err.response?.data?.error || err.message || 'Failed to create prescription')
    } finally {
      setSubmitting(false)
    }
    return null
  }, [form, medications, token])

  // Dashboard split-view submit → mini success banner
  const handleDashSubmit = useCallback(async (e) => {
    e.preventDefault()
    const rxId = await submitPrescription()
    if (rxId) {
      setDashSuccess(true)
      setForm({ patientId: '', diagnosis: '', expiryDays: '', notes: '' })
      setMedications([newMedItem()])
      setFormErrors({})
      setTimeout(() => setDashSuccess(false), 3000)
    }
  }, [submitPrescription])

  // Full-width new-rx submit → success card
  const handleNewRxSubmit = useCallback(async (e) => {
    e.preventDefault()
    const expiryDays = parseInt(form.expiryDays, 10) || 90
    const rxId = await submitPrescription()
    if (rxId) {
      const expiry = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000)
      setSuccessExpiry(expiry.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }))
      setSuccessRxId(rxId)
      setForm({ patientId: '', diagnosis: '', expiryDays: '', notes: '' })
      setMedications([newMedItem()])
      setFormErrors({})
    }
  }, [submitPrescription, form.expiryDays])

  const handlePatientSearch = useCallback(async () => {
    if (!patientQuery.trim()) return
    setSearchLoading(true)
    setPatientError('')
    try {
      const result = await searchPatientAPI(token, patientQuery)
      if (result.success) {
        setPatientResult(result.data)
        setPatientSearched(true)
      }
    } catch (err) {
      setPatientError(err.response?.data?.error || 'Patient not found')
      setPatientSearched(true)
    } finally {
      setSearchLoading(false)
    }
  }, [patientQuery, token])

  const issueForPatient = useCallback(() => {
    setForm(f => ({ ...f, patientId: patientQuery }))
    setSuccessRxId(null)
    setActiveView('new-rx')
    setTimeout(() => { if (patientIdRef.current) patientIdRef.current.focus() }, 50)
  }, [patientQuery])

  // ─── Back button ─────────────────────────────────────────────────────────
  const backBtn = (
    <button onClick={() => goTo('dashboard')} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: 'none', border: 'none', cursor: 'pointer',
      color: MUTED, fontSize: 12, fontWeight: 600,
      fontFamily: "'Space Grotesk', sans-serif",
      padding: '0 0 20px 0', letterSpacing: '0.02em',
    }}
      onMouseEnter={e => { e.currentTarget.style.color = TEAL }}
      onMouseLeave={e => { e.currentTarget.style.color = MUTED }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 16, lineHeight: 1 }}>arrow_back</span>
      Back to Dashboard
    </button>
  )

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Space Grotesk', sans-serif",
      backgroundColor: BG_PAGE,
    }}>

      {/* ── Top navbar ─────────────────────────────────────────────────────── */}
      <header style={{
        height: 52, flexShrink: 0,
        backgroundColor: WHITE, borderBottom: `1px solid ${BORDER}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: 240 }}>
          <div style={{ width: 30, height: 30, backgroundColor: TEAL, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ color: WHITE, fontSize: 16 }}>health_and_safety</span>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, lineHeight: 1.1 }}>MedAxis</div>
            <div style={{ fontSize: 9, fontWeight: 600, color: TEAL, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Infrastructure Portal</div>
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <span style={{ fontSize: 14, color: MUTED, fontFamily: "'Space Grotesk', sans-serif" }}>Doctor Portal</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button style={iconBtn}><span className="material-symbols-outlined" style={{ fontSize: 20, color: MUTED }}>notifications</span></button>
          <button style={iconBtn}><span className="material-symbols-outlined" style={{ fontSize: 20, color: MUTED }}>settings</span></button>
          <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center', color: WHITE, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>D</div>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <aside style={{
          width: 240, flexShrink: 0,
          backgroundColor: WHITE, borderRight: `1px solid ${BORDER}`,
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto',
        }}>
          <div style={{ padding: '14px 16px 12px', borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: TEXT }}>MedAxis Admin</div>
            <div style={{ fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>Infrastructure Portal</div>
          </div>
          <nav style={{ flex: 1, padding: '8px 0' }}>
            {NAV.map(item => {
              const active = activeView === item.key
              return (
                <button key={item.key} onClick={() => goTo(item.key)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 16px',
                  background: active ? '#F0FAFA' : 'transparent',
                  border: 'none',
                  borderLeft: `3px solid ${active ? TEAL : 'transparent'}`,
                  color: active ? TEAL : MUTED,
                  fontSize: 13.5, fontWeight: active ? 600 : 500,
                  cursor: 'pointer', textAlign: 'left',
                  fontFamily: "'Space Grotesk', sans-serif",
                  transition: 'all 0.12s ease',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: active ? TEAL : '#9CA3AF', lineHeight: 1 }}>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              )
            })}
          </nav>
          <div style={{ padding: '12px 12px 16px', borderTop: `1px solid ${BORDER}` }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <button style={{ background: 'none', border: 'none', textAlign: 'left', padding: '6px 4px', fontSize: 12, color: MUTED, cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif" }}>Help Center</button>
              <button onClick={logout} style={{ background: 'none', border: 'none', textAlign: 'left', padding: '6px 4px', fontSize: 12, color: MUTED, cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif" }}>Logout</button>
            </div>
          </div>
        </aside>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Page header */}
          <div style={{ padding: '16px 28px 14px', flexShrink: 0, backgroundColor: WHITE, borderBottom: `1px solid ${BORDER}` }}>
            <h1 style={{ fontSize: 17, fontWeight: 800, color: TEXT, textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Doctor Workspace</h1>
            <p style={{ fontSize: 11.5, color: MUTED, marginTop: 3, fontWeight: 500 }}>
              Regulatory Authority Portal &bull; Medical Staff ID:{' '}
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>MAR-8829</span>
            </p>
          </div>

          {/* ══ VIEW: Dashboard — summary screen ═════════════════════════════ */}
          {activeView === 'dashboard' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>

              {/* Section 1 — Greeting */}
              <div style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 24, fontWeight: 700, color: TEXT, margin: '0 0 4px', letterSpacing: '-0.02em' }}>
                  {getGreeting()}, Dr. Ahmed
                </h2>
                <div style={{ fontSize: 13, color: MUTED, marginBottom: 2 }}>{getFormattedDate()}</div>
                <div style={{ fontSize: 13, color: MUTED }}>
                  Medical Staff ID:{' '}
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", color: TEXT }}>MAR-8829</span>
                </div>
              </div>

              {/* Section 2 — Four stat cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 24, marginBottom: 32 }}>
                {/* Card 1 */}
                <div style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 20, height: 120, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: TEAL }}>receipt_long</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Prescriptions Today</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 36, fontWeight: 700, color: TEXT, lineHeight: 1, fontFamily: "'JetBrains Mono', monospace" }}>24</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: TEAL, marginTop: 4 }}>↗ +3 from yesterday</div>
                  </div>
                </div>
                {/* Card 2 */}
                <div style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 20, height: 120, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#F0A500' }}>warning</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Restricted Drugs</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 36, fontWeight: 700, color: '#F0A500', lineHeight: 1, fontFamily: "'JetBrains Mono', monospace" }}>03</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#F0A500', marginTop: 4 }}>⚠ Requires monitoring</div>
                  </div>
                </div>
                {/* Card 3 */}
                <div style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 20, height: 120, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: TEAL }}>check_circle</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Active Prescriptions</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 36, fontWeight: 700, color: TEAL, lineHeight: 1, fontFamily: "'JetBrains Mono', monospace" }}>18</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, marginTop: 4 }}>Currently valid and unfilled</div>
                  </div>
                </div>
                {/* Card 4 */}
                <div style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 20, height: 120, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#F0A500' }}>schedule</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Expiring Soon</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 36, fontWeight: 700, color: '#F0A500', lineHeight: 1, fontFamily: "'JetBrains Mono', monospace" }}>05</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#F0A500', marginTop: 4 }}>Within the next 3 days</div>
                  </div>
                </div>
              </div>

              {/* Section 3 — Recent Activity */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: TEXT }}>Recent Activity</span>
                  <span style={{ fontSize: 12, color: MUTED }}>Last 24 hours</span>
                </div>
                <div style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
                  {ACTIVITY.map((item, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0 16px', height: 52,
                      borderBottom: i < ACTIVITY.length - 1 ? `1px solid #F3F4F6` : 'none',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: item.dot, flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.action}</div>
                          <div style={{ fontSize: 11, color: MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.sub}</div>
                        </div>
                      </div>
                      <span style={{ fontSize: 11, color: MUTED, flexShrink: 0, marginLeft: 16 }}>{item.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 4 — Registry Status */}
              <div style={{
                backgroundColor: '#F0FAFA', border: `1px solid ${TEAL}`, borderRadius: 8,
                padding: '0 16px', height: 52,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#4ADE80', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: TEAL }}>National Prescription Ledger: SYNCED</span>
                </div>
                <span style={{ fontSize: 12, color: MUTED }}>
                  Last sync: {syncMinutes} min{syncMinutes === 1 ? '' : 's'} ago
                </span>
              </div>

            </div>
          )}

          {/* ══ VIEW: My Prescriptions — full width ══════════════════════════ */}
          {activeView === 'prescriptions' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }}>
              {backBtn}
              <section style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px 12px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: MUTED }}>description</span>
                    <h2 style={{ fontSize: 13, fontWeight: 800, color: TEXT, textTransform: 'uppercase', letterSpacing: '0.09em', margin: 0 }}>My Prescription History</h2>
                    <span style={{ fontSize: 11, color: MUTED, backgroundColor: '#F3F4F6', borderRadius: 4, padding: '2px 8px', fontWeight: 600 }}>{TOTAL_RECORDS} total</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['filter_list', 'file_download'].map(icon => (
                      <button key={icon} style={{ ...iconBtn, width: 30, height: 30, border: `1px solid ${BORDER}`, borderRadius: 4 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16, color: MUTED }}>{icon}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <RxTable expanded prescriptions={prescriptions} />
                <RxPagination currentPage={currentPage} totalPages={totalPages} pages={pages} onPageChange={setCurrentPage} total={TOTAL_RECORDS} />
              </section>
            </div>
          )}

          {/* ══ VIEW: New Prescription — full width ══════════════════════════ */}
          {activeView === 'new-rx' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }}>
              {backBtn}
              <div style={{ maxWidth: 640, margin: '0 auto' }}>
                {successRxId ? (
                  /* Success card */
                  <div style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '48px 40px', textAlign: 'center' }}>
                    <div style={{
                      width: 64, height: 64, borderRadius: '50%',
                      backgroundColor: '#DCFCE7', border: '2px solid #16A34A',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 20px',
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#16A34A' }}>check_circle</span>
                    </div>
                    <h2 style={{ fontSize: 22, fontWeight: 700, color: TEXT, margin: '0 0 12px', letterSpacing: '-0.01em' }}>Prescription Authorized</h2>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700, color: TEAL, marginBottom: 20 }}>
                      RxID: {successRxId}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginBottom: 20 }}>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: 10, fontWeight: 600, color: MUTED, letterSpacing: '0.07em', textTransform: 'uppercase', margin: '0 0 4px 0' }}>ISSUE DATE</p>
                        <p style={{ fontSize: 14, fontWeight: 600, color: TEXT, margin: 0 }}>
                          {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <div style={{ width: 1, backgroundColor: BORDER }} />
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: 10, fontWeight: 600, color: MUTED, letterSpacing: '0.07em', textTransform: 'uppercase', margin: '0 0 4px 0' }}>EXPIRY DATE</p>
                        <p style={{ fontSize: 14, fontWeight: 600, color: TEXT, margin: 0 }}>
                          {successExpiry || '—'}
                        </p>
                      </div>
                    </div>
                    <p style={{ fontSize: 13, color: MUTED, marginBottom: 32, lineHeight: 1.6 }}>
                      Prescription has been stored in the National Prescription Ledger
                    </p>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                      <button onClick={resetForm} style={{
                        height: 44, padding: '0 24px',
                        backgroundColor: TEAL, color: WHITE,
                        border: 'none', borderRadius: 5, fontSize: 13, fontWeight: 700,
                        cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif",
                        transition: 'background-color 0.15s',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = TEAL_DARK }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = TEAL }}
                      >Issue Another Prescription</button>
                      <button onClick={() => goTo('prescriptions')} style={{
                        height: 44, padding: '0 24px',
                        backgroundColor: WHITE, color: TEAL,
                        border: `1px solid ${TEAL}`, borderRadius: 5, fontSize: 13, fontWeight: 700,
                        cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif",
                      }}>View Prescription History</button>
                    </div>
                  </div>
                ) : (
                  /* Full-width form */
                  <section style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8 }}>
                    <div style={{ padding: '16px 24px 14px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18, color: TEAL }}>receipt_long</span>
                      <h2 style={{ fontSize: 13, fontWeight: 800, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.09em', margin: 0 }}>New Prescription</h2>
                    </div>
                    <form onSubmit={handleNewRxSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {/* 1 — Patient ID */}
                      <Field label="Patient ID">
                        <Input id="patient-id-input" inputRef={patientIdRef} height={52} value={form.patientId} onChange={v => setField('patientId', v)} placeholder="e.g. P-001" />
                        {formErrors.patientId && <p style={{ fontSize: 12, color: '#E53E3E', margin: '4px 0 0', fontWeight: 500 }}>{formErrors.patientId}</p>}
                      </Field>

                      {/* 2 — Primary Diagnosis (ephemeral) */}
                      <Field label="Primary Diagnosis">
                        <Input height={52} value={form.diagnosis} onChange={v => setField('diagnosis', v)} placeholder="Enter ICD-10 code or description — for issuance reference only" />
                        <p style={{ fontSize: 11, color: MUTED, margin: '5px 0 0', lineHeight: 1.5 }}>This field is used for prescription authorization only and is never stored in the system.</p>
                      </Field>

                      {/* 3–4 — Medications list */}
                      <div>
                        <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Medications</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {medications.map((med, idx) => (
                            <MedicationRow
                              key={med._id}
                              med={med}
                              idx={idx}
                              totalCount={medications.length}
                              onUpdate={(i, field, val) => setMedications(prev => prev.map((m, j) => j === i ? { ...m, [field]: val } : m))}
                              onRemove={(i) => setMedications(prev => prev.filter((_, j) => j !== i))}
                            />
                          ))}
                        </div>
                        {medications.length < 5 && (
                          <button
                            type="button"
                            onClick={() => setMedications(m => [...m, newMedItem()])}
                            style={{
                              marginTop: 10, height: 36, padding: '0 16px',
                              display: 'flex', alignItems: 'center', gap: 6,
                              backgroundColor: 'transparent', color: TEAL,
                              border: `1px dashed ${TEAL}`, borderRadius: 4,
                              fontSize: 12, fontWeight: 700, cursor: 'pointer',
                              fontFamily: "'Space Grotesk', sans-serif",
                              letterSpacing: '0.04em',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = TEAL_BG }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add_circle</span>
                            Add Medication
                          </button>
                        )}
                        {formErrors.medications && <p style={{ fontSize: 12, color: '#E53E3E', margin: '6px 0 0', fontWeight: 500 }}>{formErrors.medications}</p>}
                      </div>

                      {/* 6 — Expiry (optional) */}
                      <Field label="Expiry (Days) — Optional">
                        <Input height={52} type="number" value={form.expiryDays} onChange={v => setField('expiryDays', v)} placeholder="Default: 90 days" />
                        {form.expiryDays && !formErrors.expiryDays && (() => {
                          const d = new Date(Date.now() + (parseInt(form.expiryDays, 10) || 90) * 86400000)
                          return <p style={{ fontSize: 11, color: TEAL, margin: '5px 0 0', fontWeight: 600 }}>Expires on: {d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        })()}
                        {formErrors.expiryDays && <p style={{ fontSize: 12, color: '#E53E3E', margin: '4px 0 0', fontWeight: 500 }}>{formErrors.expiryDays}</p>}
                      </Field>

                      {/* 4 — Additional Notes (optional) */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                          <label style={{ fontSize: 10.5, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Additional Notes (optional)</label>
                          <span style={{ fontSize: 10, color: (form.notes || '').length > 280 ? '#E53E3E' : MUTED }}>{(form.notes || '').length}/300</span>
                        </div>
                        <textarea
                          value={form.notes}
                          onChange={e => setField('notes', e.target.value)}
                          maxLength={300}
                          rows={3}
                          placeholder="e.g. Take after meals. Avoid direct sunlight. Do not crush tablets."
                          style={{
                            width: '100%', padding: '10px 12px',
                            border: `1px solid ${formErrors.notes ? '#E53E3E' : BORDER}`, borderRadius: 4,
                            backgroundColor: WHITE, color: TEXT, fontSize: 13,
                            fontFamily: "'Space Grotesk', sans-serif",
                            outline: 'none', boxSizing: 'border-box', resize: 'vertical',
                            transition: 'border-color 0.15s ease', lineHeight: 1.5,
                          }}
                          onFocus={e => (e.target.style.borderColor = formErrors.notes ? '#E53E3E' : TEAL)}
                          onBlur={e => (e.target.style.borderColor = formErrors.notes ? '#E53E3E' : BORDER)}
                        />
                        {formErrors.notes && <p style={{ fontSize: 12, color: '#E53E3E', margin: '4px 0 0', fontWeight: 500 }}>{formErrors.notes}</p>}
                      </div>

                      <button type="submit" disabled={submitting} style={{
                        width: '100%', height: 56,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                        backgroundColor: submitting ? '#5AADAD' : TEAL, color: WHITE,
                        border: 'none', borderRadius: 5, fontSize: 13, fontWeight: 700,
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                        fontFamily: "'Space Grotesk', sans-serif",
                        marginTop: 4,
                        transition: 'background-color 0.15s ease',
                      }}
                        onMouseEnter={e => { if (!submitting) e.currentTarget.style.backgroundColor = TEAL_DARK }}
                        onMouseLeave={e => { if (!submitting) e.currentTarget.style.backgroundColor = TEAL }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>shield</span>
                        {submitting ? 'Authorizing…' : 'Authorize & Print'}
                      </button>
                      {formError && (
                        <p style={{ fontSize: 13, color: '#E53E3E', margin: 0, textAlign: 'center' }}>{formError}</p>
                      )}
                    </form>
                  </section>
                )}
              </div>
            </div>
          )}

          {/* ══ VIEW: Patient Lookup — full width ════════════════════════════ */}
          {activeView === 'patients' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }}>
              {backBtn}
              <div style={{ maxWidth: 720, margin: '0 auto' }}>
                <div style={{ marginBottom: 24 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 700, color: TEXT, margin: '0 0 6px', letterSpacing: '-0.01em' }}>Patient Lookup</h2>
                  <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>Search for a patient by their national CNIE number</p>
                </div>

                {/* Search bar */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                  <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span style={{ position: 'absolute', left: 16, pointerEvents: 'none', display: 'flex', alignItems: 'center', color: '#9CA3AF' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 22 }}>badge</span>
                    </span>
                    <input
                      ref={lookupRef}
                      type="text"
                      value={patientQuery}
                      onChange={e => { setPatientQuery(e.target.value); setPatientSearched(false) }}
                      onKeyDown={e => { if (e.key === 'Enter') handlePatientSearch() }}
                      placeholder="Enter patient CNIE number e.g. AB123456"
                      style={{
                        width: '100%', height: 56,
                        paddingLeft: 52, paddingRight: 14,
                        border: `1px solid ${BORDER}`, borderRadius: 4,
                        fontSize: 15, color: TEXT, backgroundColor: WHITE,
                        fontFamily: "'Space Grotesk', sans-serif",
                        outline: 'none', boxSizing: 'border-box',
                        transition: 'border-color 0.15s',
                      }}
                      onFocus={e => (e.target.style.borderColor = TEAL)}
                      onBlur={e => (e.target.style.borderColor = BORDER)}
                    />
                  </div>
                  <button onClick={handlePatientSearch} style={{
                    height: 56, padding: '0 28px',
                    backgroundColor: TEAL, color: WHITE,
                    border: 'none', borderRadius: 4,
                    fontSize: 12, fontWeight: 700, letterSpacing: '0.08em',
                    cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif",
                    flexShrink: 0, whiteSpace: 'nowrap',
                    transition: 'background-color 0.15s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = TEAL_DARK }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = TEAL }}
                  >SEARCH</button>
                </div>

                {/* Result */}
                {patientSearched && (
                  <div style={{ backgroundColor: WHITE, border: `1px solid ${patientError ? '#E53E3E' : BORDER}`, borderRadius: 8, padding: '20px 24px' }}>
                    {patientError ? (
                      <p style={{ fontSize: 13, color: '#E53E3E', margin: 0 }}>{patientError}</p>
                    ) : (
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                          <div style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: TEAL_BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 22, color: TEAL }}>person</span>
                          </div>
                          <div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: TEXT }}>{patientResult?.firstName || MOCK_PATIENT.firstName}</div>
                            <div style={{ fontSize: 12, color: MUTED, fontFamily: "'JetBrains Mono', monospace" }}>{patientResult?.token || MOCK_PATIENT.token}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 32 }}>
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>Patient ID</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: TEAL }}>{patientResult?.patientId || 'Verified'}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>Insurance</div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>{patientResult?.insuranceId || 'On file'}</div>
                          </div>
                        </div>
                      </div>
                      <button onClick={issueForPatient} style={{
                        height: 44, padding: '0 20px', flexShrink: 0,
                        backgroundColor: TEAL, color: WHITE,
                        border: 'none', borderRadius: 5, fontSize: 12, fontWeight: 700,
                        cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif",
                        whiteSpace: 'nowrap', transition: 'background-color 0.15s',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = TEAL_DARK }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = TEAL }}
                      >Issue Prescription for this Patient</button>
                    </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Registry Sync Active bar ──────────────────────────────────── */}
          <footer style={{
            backgroundColor: TEAL, flexShrink: 0,
            padding: '9px 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#4ADE80', flexShrink: 0 }} />
              <span className="material-symbols-outlined" style={{ fontSize: 15, color: WHITE }}>sync</span>
              <span style={{ fontSize: 11.5, fontWeight: 800, color: WHITE, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Registry Sync Active</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.72)' }}>
                Connected to National Pharmacy Grid &bull; Last synchronized: {syncMinutes} min{syncMinutes === 1 ? '' : 's'} ago
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Regulatory Zone</div>
                <div style={{ fontSize: 11.5, color: WHITE, fontWeight: 600, marginTop: 1 }}>Casablanca-Settat</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Daily Limit Status</div>
                <div style={{ fontSize: 11.5, color: WHITE, fontWeight: 600, marginTop: 1 }}>14% Utilized</div>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function RxTable({ compact, expanded, prescriptions: rows }) {
  const data = rows || PRESCRIPTIONS
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, tableLayout: compact ? 'fixed' : 'auto' }}>
      {compact && (
        <colgroup>
          <col style={{ width: '26%' }} />
          <col style={{ width: '26%' }} />
          <col style={{ width: '14%' }} />
          <col style={{ width: '14%' }} />
          <col style={{ width: '20%' }} />
        </colgroup>
      )}
      <thead>
        <tr style={{ backgroundColor: '#F9FAFB', borderBottom: `1px solid ${BORDER}` }}>
          {(expanded
            ? ['ID / CNIE', 'MEDICATION', 'DOSAGE', 'DATE', 'EXPIRY', 'STATUS', 'ACTIONS']
            : ['ID / CNIE', 'MEDICATION', 'DATE', 'STATUS', 'ACTIONS']
          ).map(col => (
            <th key={col} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: MUTED, letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{col}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((rx, i) => {
          const cfg = STATUS_CFG[rx.status] || {}
          return (
            <tr key={rx.rxId}
              style={{ backgroundColor: i % 2 === 0 ? WHITE : '#FAFAFA', borderBottom: `1px solid #F3F4F6`, transition: 'background-color 0.1s' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F0FAF9')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = i % 2 === 0 ? WHITE : '#FAFAFA')}
            >
              <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: TEAL, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.02em' }}>{rx.rxId}</div>
                <div style={{ fontSize: 11, color: MUTED, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rx.patient}</div>
              </td>
              <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rx.med}</div>
                {compact && <div style={{ fontSize: 10.5, color: MUTED, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rx.dose}</div>}
              </td>
              {expanded && <td style={{ padding: '12px 14px', verticalAlign: 'middle', fontSize: 11, color: MUTED, whiteSpace: 'nowrap' }}>{rx.dose}</td>}
              <td style={{ padding: '12px 14px', verticalAlign: 'middle', fontSize: 11, color: MUTED, whiteSpace: 'nowrap' }}>{rx.date}</td>
              {expanded && <td style={{ padding: '12px 14px', verticalAlign: 'middle', fontSize: 11, color: MUTED, whiteSpace: 'nowrap' }}>{rx.expiry}</td>}
              <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: cfg.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color, letterSpacing: '0.05em' }}>{cfg.label}</span>
                </div>
              </td>
              <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                <ActionButton label={cfg.action} color={cfg.color} hoverBg={cfg.hoverBg} />
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function RxPagination({ currentPage, totalPages, pages, onPageChange, total }) {
  return (
    <div style={{ padding: '10px 16px', borderTop: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FAFAFA', flexShrink: 0 }}>
      <span style={{ fontSize: 11, color: MUTED }}>Showing 5 of {total} records</span>
      <div style={{ display: 'flex', gap: 3 }}>
        <PageBtn disabled={currentPage === 1} onClick={() => onPageChange(p => Math.max(1, p - 1))}>
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chevron_left</span>
        </PageBtn>
        {pages.map(pg => (
          <PageBtn key={pg} active={pg === currentPage} onClick={() => onPageChange(pg)}>{pg}</PageBtn>
        ))}
        <PageBtn disabled={currentPage === totalPages} onClick={() => onPageChange(p => Math.min(totalPages, p + 1))}>
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chevron_right</span>
        </PageBtn>
      </div>
    </div>
  )
}

function Field({ label, children, style }) {
  return (
    <div style={style}>
      <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text', padLeft, id, inputRef, height = 44 }) {
  return (
    <input
      id={id}
      ref={inputRef}
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', height,
        padding: `0 12px 0 ${padLeft || 12}px`,
        border: `1px solid ${BORDER}`, borderRadius: 4,
        backgroundColor: WHITE, color: TEXT, fontSize: 13,
        fontFamily: "'Space Grotesk', sans-serif",
        outline: 'none', boxSizing: 'border-box',
        transition: 'border-color 0.15s ease',
      }}
      onFocus={e => (e.target.style.borderColor = TEAL)}
      onBlur={e  => (e.target.style.borderColor = BORDER)}
    />
  )
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ flex: 1, backgroundColor: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 26, fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1.4 }}>{label}</span>
    </div>
  )
}

function ActionButton({ label, color, hoverBg }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '4px 9px', fontSize: 9.5, fontWeight: 700,
        letterSpacing: '0.07em', textTransform: 'uppercase',
        color: hovered ? WHITE : color,
        backgroundColor: hovered ? hoverBg : 'transparent',
        border: `1px solid ${color}`,
        borderRadius: 3, cursor: 'pointer',
        fontFamily: "'Space Grotesk', sans-serif",
        transition: 'all 0.12s ease', whiteSpace: 'nowrap',
      }}
    >{label}</button>
  )
}

function PageBtn({ children, active, disabled, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        minWidth: 28, height: 28, padding: '0 5px',
        border: `1px solid ${active ? TEAL : (hovered ? TEAL : BORDER)}`,
        borderRadius: 4,
        backgroundColor: active ? TEAL : WHITE,
        color: active ? WHITE : (hovered ? TEAL : MUTED),
        fontSize: 11.5, fontWeight: active ? 700 : 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Space Grotesk', sans-serif",
        transition: 'all 0.1s ease',
      }}
    >{children}</button>
  )
}

// ─── MedicationRow ────────────────────────────────────────────────────────────
function MedicationRow({ med, idx, totalCount, onUpdate, onRemove }) {
  const [query, setQuery] = useState(med.selectedMed ? med.selectedMed.name : '')
  const [showDropdown, setShowDropdown] = useState(false)

  const filtered = MEDICATIONS.filter(m =>
    query.length === 0 || m.name.toLowerCase().includes(query.toLowerCase())
  )

  const fo = med.selectedMed?.forms.find(f => f.form === med.selectedForm) || null
  const dosageMeta = getDosageMeta(fo)
  const maxDosage = fo ? getMaxForForm(fo) : null

  const selectMed = (m) => {
    setQuery(m.name)
    setShowDropdown(false)
    const firstForm = m.forms[0]
    onUpdate(idx, 'selectedMed', m)
    onUpdate(idx, 'selectedForm', firstForm.form)
    onUpdate(idx, 'dosageAmount', String(firstForm.default_dose))
    onUpdate(idx, 'dosageError', '')
  }

  const handleFormChange = (formName) => {
    const newFo = med.selectedMed?.forms.find(f => f.form === formName)
    onUpdate(idx, 'selectedForm', formName)
    if (newFo) {
      onUpdate(idx, 'dosageAmount', String(newFo.default_dose))
      onUpdate(idx, 'dosageError', '')
    }
  }

  const handleDosageChange = (v) => {
    onUpdate(idx, 'dosageAmount', v)
    if (fo) {
      const n = parseFloat(v)
      const max = getMaxForForm(fo)
      if (!v || isNaN(n) || n <= 0) {
        onUpdate(idx, 'dosageError', `${dosageMeta.label} must be greater than 0`)
      } else if (n > max) {
        onUpdate(idx, 'dosageError', `Maximum is ${max} ${fo.unit} per dose`)
      } else {
        onUpdate(idx, 'dosageError', '')
      }
    }
  }

  const inputSt = {
    width: '100%', height: 44,
    padding: '0 12px',
    border: `1px solid ${BORDER}`, borderRadius: 4,
    backgroundColor: WHITE, color: TEXT, fontSize: 13,
    fontFamily: "'Space Grotesk', sans-serif",
    outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.15s ease',
  }
  const lbl = (text) => (
    <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{text}</label>
  )

  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 6, padding: 16, position: 'relative', backgroundColor: '#FAFAFA' }}>
      {totalCount > 1 && (
        <button
          type="button"
          onClick={() => onRemove(idx)}
          style={{
            position: 'absolute', top: 10, right: 10,
            width: 24, height: 24, borderRadius: '50%',
            border: `1px solid ${BORDER}`, backgroundColor: WHITE,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: MUTED, fontSize: 14, fontWeight: 700, lineHeight: 1,
            fontFamily: "'Space Grotesk', sans-serif",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#E53E3E'; e.currentTarget.style.color = '#E53E3E' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = MUTED }}
        >×</button>
      )}
      {med.selectedMed?.controlled && (
        <div style={{ marginBottom: 12, padding: '6px 10px', backgroundColor: '#FFF5F5', border: '1px solid #FCA5A5', borderRadius: 4, fontSize: 11, fontWeight: 700, color: '#DC2626' }}>
          ⚠ Controlled Substance — regulatory logging required
        </div>
      )}

      {/* Row 1: Medication search + Form */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          {lbl('Medication')}
          <div style={{ position: 'relative' }}>
            <input
              value={query}
              onChange={e => {
                setQuery(e.target.value)
                setShowDropdown(true)
                if (!e.target.value) {
                  onUpdate(idx, 'selectedMed', null)
                  onUpdate(idx, 'selectedForm', '')
                  onUpdate(idx, 'dosageAmount', '')
                }
              }}
              onFocus={e => { setShowDropdown(true); e.target.style.borderColor = TEAL }}
              onBlur={e => { setTimeout(() => setShowDropdown(false), 150); e.target.style.borderColor = BORDER }}
              placeholder="Search medication..."
              style={{ ...inputSt, paddingLeft: 36 }}
            />
            <span className="material-symbols-outlined" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: '#9CA3AF', pointerEvents: 'none' }}>search</span>
            {showDropdown && filtered.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, backgroundColor: WHITE, border: `1px solid ${BORDER}`, borderRadius: 4, marginTop: 2, maxHeight: 200, overflowY: 'auto' }}>
                {filtered.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onMouseDown={() => selectMed(m)}
                    style={{ width: '100%', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: 'none', borderBottom: `1px solid #F3F4F6`, backgroundColor: 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: "'Space Grotesk', sans-serif" }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F0FAFA')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{m.name}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 10, color: MUTED, fontFamily: "'JetBrains Mono', monospace" }}>{m.drug_code}</span>
                      {m.controlled && <span style={{ fontSize: 9, color: '#DC2626', fontWeight: 700, letterSpacing: '0.05em' }}>CTRL</span>}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div>
          {lbl('Form')}
          <select
            value={med.selectedForm}
            onChange={e => handleFormChange(e.target.value)}
            disabled={!med.selectedMed}
            style={{ ...inputSt, color: med.selectedMed ? TEXT : MUTED, cursor: med.selectedMed ? 'pointer' : 'not-allowed', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: 32 }}
            onFocus={e => (e.target.style.borderColor = TEAL)}
            onBlur={e => (e.target.style.borderColor = BORDER)}
          >
            {med.selectedMed
              ? med.selectedMed.forms.map(f => <option key={f.form} value={f.form}>{f.form}</option>)
              : <option value="">— select medication first —</option>
            }
          </select>
        </div>
      </div>

      {/* Row 2: Dosage | Frequency | Duration */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <div>
          {lbl(fo ? dosageMeta.label : 'Dosage')}
          <div style={{ position: 'relative' }}>
            <input
              type="number"
              min="0"
              step={fo && ['syrup', 'liquid'].includes(fo.form) ? '0.5' : '1'}
              value={med.dosageAmount}
              onChange={e => handleDosageChange(e.target.value)}
              disabled={!fo}
              placeholder={fo ? `max ${maxDosage}` : '—'}
              style={{ ...inputSt, borderColor: med.dosageError ? '#E53E3E' : BORDER, paddingRight: fo ? 40 : 12, cursor: fo ? 'text' : 'not-allowed', color: fo ? TEXT : MUTED }}
              onFocus={e => (e.target.style.borderColor = med.dosageError ? '#E53E3E' : TEAL)}
              onBlur={e => (e.target.style.borderColor = med.dosageError ? '#E53E3E' : BORDER)}
            />
            {fo && (
              <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: MUTED, fontWeight: 600, pointerEvents: 'none' }}>{fo.unit}</span>
            )}
          </div>
          {med.dosageError && <p style={{ fontSize: 11, color: '#E53E3E', margin: '4px 0 0', fontWeight: 500 }}>{med.dosageError}</p>}
        </div>
        <div>
          {lbl('Frequency')}
          <input
            value={med.frequency}
            onChange={e => onUpdate(idx, 'frequency', e.target.value)}
            placeholder="e.g. TID, BID"
            style={inputSt}
            onFocus={e => (e.target.style.borderColor = TEAL)}
            onBlur={e => (e.target.style.borderColor = BORDER)}
          />
        </div>
        <div>
          {lbl('Duration (days)')}
          <input
            type="number"
            min="1"
            max="365"
            value={med.duration}
            onChange={e => onUpdate(idx, 'duration', e.target.value)}
            placeholder="e.g. 7"
            style={inputSt}
            onFocus={e => (e.target.style.borderColor = TEAL)}
            onBlur={e => (e.target.style.borderColor = BORDER)}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Tiny style constants ────────────────────────────────────────────────────
const iconBtn = {
  background: 'none', border: 'none',
  cursor: 'pointer', padding: 4,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
