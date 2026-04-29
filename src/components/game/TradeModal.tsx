'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/utils/format';
import { BOARD_SPACES } from '@/lib/game/board-data';
import { getTokenEmoji } from '@/lib/utils/tokens';
import type { PlayerState, PropertyState, RoomPlayer, TradeOffer } from '@/types/game';
import { ArrowRightLeft, X, Check, Minus, Plus } from 'lucide-react';

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  myPlayerState: PlayerState;
  myRoomPlayer: RoomPlayer;
  otherPlayers: Array<{ playerState: PlayerState; roomPlayer: RoomPlayer }>;
  propertyStates: PropertyState[];
  onProposeTrade: (offer: TradeOffer, request: TradeOffer, recipientId: string) => void;
}

export default function TradeModal({
  isOpen,
  onClose,
  myPlayerState,
  myRoomPlayer,
  otherPlayers,
  propertyStates,
  onProposeTrade,
}: TradeModalProps) {
  const [selectedRecipient, setSelectedRecipient] = useState<string | null>(
    otherPlayers[0]?.roomPlayer.id ?? null
  );

  const [offerCash, setOfferCash] = useState(0);
  const [requestCash, setRequestCash] = useState(0);
  const [offerProperties, setOfferProperties] = useState<number[]>([]);
  const [requestProperties, setRequestProperties] = useState<number[]>([]);
  const [offerGoojCards, setOfferGoojCards] = useState(0);
  const [requestGoojCards, setRequestGoojCards] = useState(0);

  const myProperties = propertyStates.filter(
    (p) => p.owner_id === myRoomPlayer.id && p.houses === 0
  );

  const recipientPlayer = otherPlayers.find(
    (p) => p.roomPlayer.id === selectedRecipient
  );

  const recipientProperties = selectedRecipient
    ? propertyStates.filter(
        (p) => p.owner_id === selectedRecipient && p.houses === 0
      )
    : [];

  const toggleOfferProperty = (propId: number) => {
    setOfferProperties((prev) =>
      prev.includes(propId) ? prev.filter((id) => id !== propId) : [...prev, propId]
    );
  };

  const toggleRequestProperty = (propId: number) => {
    setRequestProperties((prev) =>
      prev.includes(propId) ? prev.filter((id) => id !== propId) : [...prev, propId]
    );
  };

  const handleSubmit = () => {
    if (!selectedRecipient) return;
    onProposeTrade(
      { cash: offerCash, properties: offerProperties, gooj_cards: offerGoojCards },
      { cash: requestCash, properties: requestProperties, gooj_cards: requestGoojCards },
      selectedRecipient
    );
    onClose();
  };

  const netCash = requestCash - offerCash;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-game-navy border border-game-card-border rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-game-card-border">
            <h2 className="font-display text-lg font-bold text-game-text-primary flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-game-gold" />
              Propose Trade
            </h2>
            <button onClick={onClose} className="text-game-text-muted hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Recipient selector */}
          <div className="p-4 border-b border-game-card-border">
            <label className="text-xs text-game-text-muted font-semibold uppercase mb-2 block">
              Trade with
            </label>
            <div className="flex gap-2 flex-wrap">
              {otherPlayers.map(({ roomPlayer: rp, playerState: ps }) => (
                <button
                  key={rp.id}
                  onClick={() => {
                    setSelectedRecipient(rp.id);
                    setRequestProperties([]);
                    setRequestGoojCards(0);
                  }}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all',
                    selectedRecipient === rp.id
                      ? 'border-game-gold bg-game-gold/10 text-game-gold'
                      : 'border-game-card-border text-game-text-muted hover:border-game-text-muted'
                  )}
                >
                  <span>{getTokenEmoji(rp.token)}</span>
                  <span>{rp.display_name}</span>
                  <span className="font-mono text-xs">{formatMoney(ps.cash)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Trade columns */}
          <div className="grid grid-cols-2 divide-x divide-game-card-border">
            {/* YOUR OFFER */}
            <div className="p-4">
              <h3 className="font-display text-sm font-semibold text-game-gold mb-3">
                You Offer
              </h3>

              {/* Cash */}
              <div className="mb-3">
                <label className="text-xs text-game-text-muted block mb-1">Cash</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setOfferCash(Math.max(0, offerCash - 50))}
                    className="p-1 rounded bg-game-card hover:bg-slate-600"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <input
                    type="number"
                    value={offerCash}
                    onChange={(e) =>
                      setOfferCash(
                        Math.min(
                          myPlayerState.cash,
                          Math.max(0, parseInt(e.target.value) || 0)
                        )
                      )
                    }
                    className="w-20 bg-game-card border border-game-card-border rounded px-2 py-1 text-sm font-mono text-center"
                  />
                  <button
                    onClick={() => setOfferCash(Math.min(myPlayerState.cash, offerCash + 50))}
                    className="p-1 rounded bg-game-card hover:bg-slate-600"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Properties */}
              <div className="mb-3">
                <label className="text-xs text-game-text-muted block mb-1">Properties</label>
                <div className="flex flex-col gap-1 max-h-32 overflow-y-auto scrollbar-thin">
                  {myProperties.map((prop) => {
                    const space = BOARD_SPACES[prop.property_id];
                    if (!space) return null;
                    const selected = offerProperties.includes(prop.property_id);
                    return (
                      <button
                        key={prop.property_id}
                        onClick={() => toggleOfferProperty(prop.property_id)}
                        className={cn(
                          'flex items-center gap-2 px-2 py-1 rounded text-xs text-left transition-all',
                          selected
                            ? 'bg-game-gold/20 border border-game-gold'
                            : 'bg-game-card border border-transparent hover:border-game-card-border'
                        )}
                      >
                        {selected && <Check className="w-3 h-3 text-game-gold" />}
                        <span className="truncate">{space.name}</span>
                      </button>
                    );
                  })}
                  {myProperties.length === 0 && (
                    <p className="text-xs text-game-text-muted italic">No properties to offer</p>
                  )}
                </div>
              </div>

              {/* GOOJF Cards */}
              {myPlayerState.get_out_of_jail_cards > 0 && (
                <div>
                  <label className="text-xs text-game-text-muted block mb-1">
                    Get Out of Jail Cards ({myPlayerState.get_out_of_jail_cards})
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setOfferGoojCards(Math.max(0, offerGoojCards - 1))}
                      className="p-1 rounded bg-game-card hover:bg-slate-600"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-mono text-sm w-6 text-center">{offerGoojCards}</span>
                    <button
                      onClick={() =>
                        setOfferGoojCards(
                          Math.min(myPlayerState.get_out_of_jail_cards, offerGoojCards + 1)
                        )
                      }
                      className="p-1 rounded bg-game-card hover:bg-slate-600"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* YOU REQUEST */}
            <div className="p-4">
              <h3 className="font-display text-sm font-semibold text-game-success mb-3">
                You Request
              </h3>

              {/* Cash */}
              <div className="mb-3">
                <label className="text-xs text-game-text-muted block mb-1">Cash</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setRequestCash(Math.max(0, requestCash - 50))}
                    className="p-1 rounded bg-game-card hover:bg-slate-600"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <input
                    type="number"
                    value={requestCash}
                    onChange={(e) =>
                      setRequestCash(Math.max(0, parseInt(e.target.value) || 0))
                    }
                    className="w-20 bg-game-card border border-game-card-border rounded px-2 py-1 text-sm font-mono text-center"
                  />
                  <button
                    onClick={() => setRequestCash(requestCash + 50)}
                    className="p-1 rounded bg-game-card hover:bg-slate-600"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Properties */}
              <div className="mb-3">
                <label className="text-xs text-game-text-muted block mb-1">Properties</label>
                <div className="flex flex-col gap-1 max-h-32 overflow-y-auto scrollbar-thin">
                  {recipientProperties.map((prop) => {
                    const space = BOARD_SPACES[prop.property_id];
                    if (!space) return null;
                    const selected = requestProperties.includes(prop.property_id);
                    return (
                      <button
                        key={prop.property_id}
                        onClick={() => toggleRequestProperty(prop.property_id)}
                        className={cn(
                          'flex items-center gap-2 px-2 py-1 rounded text-xs text-left transition-all',
                          selected
                            ? 'bg-game-success/20 border border-game-success'
                            : 'bg-game-card border border-transparent hover:border-game-card-border'
                        )}
                      >
                        {selected && <Check className="w-3 h-3 text-game-success" />}
                        <span className="truncate">{space.name}</span>
                      </button>
                    );
                  })}
                  {recipientProperties.length === 0 && (
                    <p className="text-xs text-game-text-muted italic">No properties to request</p>
                  )}
                </div>
              </div>

              {/* GOOJF Cards */}
              {recipientPlayer && recipientPlayer.playerState.get_out_of_jail_cards > 0 && (
                <div>
                  <label className="text-xs text-game-text-muted block mb-1">
                    Get Out of Jail Cards ({recipientPlayer.playerState.get_out_of_jail_cards})
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setRequestGoojCards(Math.max(0, requestGoojCards - 1))}
                      className="p-1 rounded bg-game-card hover:bg-slate-600"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-mono text-sm w-6 text-center">{requestGoojCards}</span>
                    <button
                      onClick={() =>
                        setRequestGoojCards(
                          Math.min(
                            recipientPlayer.playerState.get_out_of_jail_cards,
                            requestGoojCards + 1
                          )
                        )
                      }
                      className="p-1 rounded bg-game-card hover:bg-slate-600"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Summary + Submit */}
          <div className="p-4 border-t border-game-card-border flex items-center justify-between">
            <div className="text-sm">
              <span className="text-game-text-muted">Net cash: </span>
              <span
                className={cn(
                  'font-mono font-bold',
                  netCash > 0 ? 'text-game-success' : netCash < 0 ? 'text-game-danger' : 'text-game-text-muted'
                )}
              >
                {netCash >= 0 ? '+' : ''}{formatMoney(netCash)}
              </span>
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} className="action-btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={
                  !selectedRecipient ||
                  (offerCash === 0 && offerProperties.length === 0 && offerGoojCards === 0 &&
                   requestCash === 0 && requestProperties.length === 0 && requestGoojCards === 0)
                }
                className="action-btn-primary"
              >
                Send Proposal
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
