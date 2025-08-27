from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class TallyField(BaseModel):
    key: str
    label: str
    type: str
    value: Any
    options: Optional[List[Dict[str, Any]]] = None

class TallyFormData(BaseModel):
    responseId: str
    submissionId: str
    respondentId: str
    formId: str
    formName: str
    createdAt: str
    fields: List[TallyField]

class TallySubmission(BaseModel):
    eventId: str
    eventType: str
    createdAt: str
    data: TallyFormData