from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.generated import TestToTechnicals
from ..schemas.generated import TestToTechnicalsCreate, TestToTechnicalsResponse

router = APIRouter(prefix='/test-to-technicals', tags=['test_to_technicals'])

@router.get('/', response_model=List[TestToTechnicalsResponse])
def get_all(request: Request, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    query = db.query(TestToTechnicals)
    for key, value in request.query_params.items():
        if key in ['skip', 'limit', 'order_by', 'order_dir']: continue
        if key.startswith('eq_'):
            field = key[3:]
            if hasattr(TestToTechnicals, field):
                query = query.filter(getattr(TestToTechnicals, field) == value)
        elif key.startswith('in_'):
            field = key[3:]
            if hasattr(TestToTechnicals, field):
                query = query.filter(getattr(TestToTechnicals, field).in_(value.split(',')))
    order_by = request.query_params.get('order_by')
    order_dir = request.query_params.get('order_dir', 'asc')
    if order_by and hasattr(TestToTechnicals, order_by):
        if order_dir == 'desc':
            query = query.order_by(getattr(TestToTechnicals, order_by).desc())
        else:
            query = query.order_by(getattr(TestToTechnicals, order_by).asc())
    return query.offset(skip).limit(limit).all()

@router.get('/{record_id}', response_model=TestToTechnicalsResponse)
def get_one(record_id: str, db: Session = Depends(get_db)):
    record = db.query(TestToTechnicals).filter(TestToTechnicals.test_id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail='Not found')
    return record

@router.post('/', response_model=TestToTechnicalsResponse)
def create(data: TestToTechnicalsCreate, db: Session = Depends(get_db)):
    new_record = TestToTechnicals(**data.model_dump(exclude_unset=True))
    db.add(new_record)
    db.commit()
    db.refresh(new_record)
    return new_record

@router.put('/{record_id}', response_model=TestToTechnicalsResponse)
def update(record_id: str, data: TestToTechnicalsCreate, db: Session = Depends(get_db)):
    record = db.query(TestToTechnicals).filter(TestToTechnicals.test_id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail='Not found')
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(record, key, value)
    db.commit()
    db.refresh(record)
    return record

@router.delete('/{record_id}')
def delete(record_id: str, db: Session = Depends(get_db)):
    record = db.query(TestToTechnicals).filter(TestToTechnicals.test_id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail='Not found')
    db.delete(record)
    db.commit()
    return {'detail': 'Deleted'}
